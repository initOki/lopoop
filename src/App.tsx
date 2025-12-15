import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Wallet, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import type { Debt } from './types/debt'
import { supabase } from './lib/supabase'

interface DebtRow {
  id: string
  debtor: string
  creditor: string
  amount: number | null
  item: string | null
  description: string | null
  created_at: string
  is_paid: boolean
}

function App() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDebts()
  }, [])

  const fetchDebts = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedDebts: Debt[] =
        (data as DebtRow[])?.map((debt) => ({
          id: debt.id,
          debtor: debt.debtor,
          creditor: debt.creditor,
          amount: debt.amount ?? undefined,
          item: debt.item ?? undefined,
          description: debt.description ?? undefined,
          createdAt: new Date(debt.created_at),
          isPaid: debt.is_paid,
        })) || []

      setDebts(formattedDebts)
    } catch (error) {
      console.error('Error fetching debts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 통계 계산
  const totalDebts = debts.length
  const unpaidDebts = debts.filter((d) => !d.isPaid).length
  const paidDebts = debts.filter((d) => d.isPaid).length
  const totalAmount = debts
    .filter((d) => !d.isPaid && d.amount)
    .reduce((sum, d) => sum + (d.amount || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Wallet className="text-white opacity-80" size={32} />
              <span className="text-blue-100 text-sm font-medium">전체</span>
            </div>
            <div className="text-white">
              <p className="text-3xl font-bold">{totalDebts}</p>
              <p className="text-blue-100 text-sm mt-1">총 빚 건수</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-white opacity-80" size={32} />
              <span className="text-red-100 text-sm font-medium">미납</span>
            </div>
            <div className="text-white">
              <p className="text-3xl font-bold">{unpaidDebts}</p>
              <p className="text-red-100 text-sm mt-1">미납 건수</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="text-white opacity-80" size={32} />
              <span className="text-green-100 text-sm font-medium">완납</span>
            </div>
            <div className="text-white">
              <p className="text-3xl font-bold">{paidDebts}</p>
              <p className="text-green-100 text-sm mt-1">완납 건수</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="text-white opacity-80" size={32} />
              <span className="text-purple-100 text-sm font-medium">금액</span>
            </div>
            <div className="text-white">
              <p className="text-2xl font-bold">
                {totalAmount.toLocaleString()}원
              </p>
              <p className="text-purple-100 text-sm mt-1">미납 총액</p>
            </div>
          </div>
        </div> */}

        <div className="bg-gray-800 rounded-xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">최근 빚 목록</h2>
            <Link
              to="/debts"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              전체 보기
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-gray-400">로딩 중...</div>
          ) : debts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">등록된 빚이 없습니다.</p>
              <Link
                to="/debts"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                첫 빚을 추가해보세요
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {debts.slice(0, 5).map((debt) => (
                <div
                  key={debt.id}
                  className={`bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors ${
                    debt.isPaid ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 font-semibold">
                        {debt.debtor}
                      </span>
                      <span className="text-gray-500">→</span>
                      <span className="text-green-400 font-semibold">
                        {debt.creditor}
                      </span>
                      {debt.isPaid && (
                        <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded">
                          갚음
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {debt.amount && (
                        <p className="text-white font-bold">
                          {debt.amount.toLocaleString()}원
                        </p>
                      )}
                      {debt.item && (
                        <p className="text-gray-400 text-sm">{debt.item}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
