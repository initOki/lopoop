import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import type { Debt } from '../types/debt'
import { supabase } from '../lib/supabase'

// Supabase 데이터베이스 타입 정의
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

export default function DebtPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    debtor: '',
    creditor: '',
    amount: '',
    item: '',
    description: '',
  })

  // Supabase에서 빚 목록 가져오기
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
      alert('빚 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data, error } = await supabase
        .from('debts')
        .insert({
          debtor: formData.debtor,
          creditor: formData.creditor,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          item: formData.item || null,
          description: formData.description || null,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        const debtRow = data as DebtRow
        const newDebt: Debt = {
          id: debtRow.id,
          debtor: debtRow.debtor,
          creditor: debtRow.creditor,
          amount: debtRow.amount ?? undefined,
          item: debtRow.item ?? undefined,
          description: debtRow.description ?? undefined,
          createdAt: new Date(debtRow.created_at),
          isPaid: debtRow.is_paid,
        }

        setDebts([newDebt, ...debts])
      }

      setFormData({
        debtor: '',
        creditor: '',
        amount: '',
        item: '',
        description: '',
      })
      setIsFormOpen(false)
    } catch (error) {
      console.error('Error creating debt:', error)
      alert('빚을 추가하는데 실패했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('debts').delete().eq('id', id)

      if (error) throw error

      setDebts(debts.filter((debt) => debt.id !== id))
    } catch (error) {
      console.error('Error deleting debt:', error)
      alert('빚을 삭제하는데 실패했습니다.')
    }
  }

  const togglePaid = async (id: string) => {
    const debt = debts.find((d) => d.id === id)
    if (!debt) return

    try {
      const { error } = await supabase
        .from('debts')
        .update({ is_paid: !debt.isPaid })
        .eq('id', id)

      if (error) throw error

      setDebts(
        debts.map((debt) =>
          debt.id === id ? { ...debt, isPaid: !debt.isPaid } : debt,
        ),
      )
    } catch (error) {
      console.error('Error updating debt:', error)
      alert('빚 상태를 변경하는데 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">빚 관리</h1>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />새 빚 추가
          </button>
        </div>

        {/* 빚 목록 */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              로딩 중...
            </div>
          ) : debts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              등록된 빚이 없습니다. 새 빚을 추가해보세요.
            </div>
          ) : (
            debts.map((debt) => (
              <div
                key={debt.id}
                className={`bg-white rounded-lg shadow p-6 ${
                  debt.isPaid ? 'opacity-60' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-lg text-red-600">
                        {debt.debtor}
                      </span>
                      <span className="text-gray-500">→</span>
                      <span className="font-semibold text-lg text-green-600">
                        {debt.creditor}
                      </span>
                      {debt.isPaid && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          갚음
                        </span>
                      )}
                    </div>

                    <div className="text-gray-700 space-y-1">
                      {debt.amount && (
                        <p className="text-xl font-bold text-blue-600">
                          {debt.amount.toLocaleString()}원
                        </p>
                      )}
                      {debt.item && (
                        <p className="text-gray-600">
                          <span className="font-medium">아이템:</span>{' '}
                          {debt.item}
                        </p>
                      )}
                      {debt.description && (
                        <p className="text-gray-600">
                          <span className="font-medium">설명:</span>{' '}
                          {debt.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-400">
                        {new Date(debt.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => togglePaid(debt.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        debt.isPaid
                          ? 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                          : 'bg-green-100 hover:bg-green-200 text-green-600'
                      }`}
                      title={debt.isPaid ? '미납으로 변경' : '갚음으로 표시'}
                    >
                      {debt.isPaid ? <X size={20} /> : <Check size={20} />}
                    </button>
                    <button
                      onClick={() => handleDelete(debt.id)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 폼 모달 */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">새 빚 추가</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    빚진 사람 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.debtor}
                    onChange={(e) =>
                      setFormData({ ...formData, debtor: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이름을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    빚을 받아야 하는 사람 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.creditor}
                    onChange={(e) =>
                      setFormData({ ...formData, creditor: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이름을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    금액
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="금액을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    아이템
                  </label>
                  <input
                    type="text"
                    value={formData.item}
                    onChange={(e) =>
                      setFormData({ ...formData, item: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="아이템 이름을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="추가 설명을 입력하세요"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false)
                      setFormData({
                        debtor: '',
                        creditor: '',
                        amount: '',
                        item: '',
                        description: '',
                      })
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
