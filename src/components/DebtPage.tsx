import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, X, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
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

// 아이템 인터페이스
interface DebtItem {
  id: string
  amount: string
  item: string
  description: string
}

export default function DebtPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [formData, setFormData] = useState({
    debtor: '',
    creditor: '',
  })
  const [debtItems, setDebtItems] = useState<DebtItem[]>([
    { id: crypto.randomUUID(), amount: '', item: '', description: '' },
  ])

  // Supabase에서 빚 목록 가져오기 및 실시간 구독
  useEffect(() => {
    fetchDebts()

    // Supabase 실시간 구독 설정
    const channel = supabase
      .channel('debts-page-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두 감지
          schema: 'public',
          table: 'debts',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as DebtRow
            const newDebt: Debt = {
              id: newRow.id,
              debtor: newRow.debtor,
              creditor: newRow.creditor,
              amount: newRow.amount ?? undefined,
              item: newRow.item ?? undefined,
              description: newRow.description ?? undefined,
              createdAt: new Date(newRow.created_at),
              isPaid: newRow.is_paid,
            }
            setDebts((prev) => [newDebt, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as DebtRow
            setDebts((prev) =>
              prev.map((debt) =>
                debt.id === updatedRow.id
                  ? {
                      id: updatedRow.id,
                      debtor: updatedRow.debtor,
                      creditor: updatedRow.creditor,
                      amount: updatedRow.amount ?? undefined,
                      item: updatedRow.item ?? undefined,
                      description: updatedRow.description ?? undefined,
                      createdAt: new Date(updatedRow.created_at),
                      isPaid: updatedRow.is_paid,
                    }
                  : debt,
              ),
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedRow = payload.old as DebtRow
            setDebts((prev) => prev.filter((debt) => debt.id !== deletedRow.id))
          }
        },
      )
      .subscribe()

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      supabase.removeChannel(channel)
    }
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
      toast.error('빚 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingDebt) {
      // 수정 모드
      await handleUpdate()
    } else {
      // 추가 모드 - 여러 개의 빚을 한번에 등록
      try {
        // 각 아이템에 대해 별도의 빚 레코드 생성
        const debtsToInsert = debtItems.map((item) => ({
          debtor: formData.debtor,
          creditor: formData.creditor,
          amount: item.amount ? parseFloat(item.amount) : null,
          item: item.item || null,
          description: item.description || null,
        }))

        const { error } = await supabase.from('debts').insert(debtsToInsert)

        if (error) throw error

        toast.success(`${debtItems.length}개의 빚이 추가되었습니다.`)

        // 실시간 구독이 실패할 경우를 대비한 백업 새로고침
        setTimeout(() => fetchDebts(), 1000)

        setFormData({
          debtor: '',
          creditor: '',
        })
        setDebtItems([
          { id: crypto.randomUUID(), amount: '', item: '', description: '' },
        ])
        setIsFormOpen(false)
      } catch (error) {
        console.error('Error creating debt:', error)
        toast.error('빚을 추가하는데 실패했습니다.')
      }
    }
  }

  const handleUpdate = async () => {
    if (!editingDebt) return

    try {
      // 수정 모드에서는 첫 번째 아이템만 사용
      const firstItem = debtItems[0]
      const { error } = await supabase
        .from('debts')
        .update({
          debtor: formData.debtor,
          creditor: formData.creditor,
          amount: firstItem.amount ? parseFloat(firstItem.amount) : null,
          item: firstItem.item || null,
          description: firstItem.description || null,
        })
        .eq('id', editingDebt.id)

      if (error) throw error

      toast.success('빚이 수정되었습니다.')

      // 실시간 구독이 실패할 경우를 대비한 백업 새로고침
      setTimeout(() => fetchDebts(), 1000)

      setFormData({
        debtor: '',
        creditor: '',
      })
      setDebtItems([
        { id: crypto.randomUUID(), amount: '', item: '', description: '' },
      ])
      setIsFormOpen(false)
      setEditingDebt(null)
    } catch (error) {
      console.error('Error updating debt:', error)
      toast.error('빚을 수정하는데 실패했습니다.')
    }
  }

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt)
    setFormData({
      debtor: debt.debtor,
      creditor: debt.creditor,
    })
    setDebtItems([
      {
        id: crypto.randomUUID(),
        amount: debt.amount?.toString() || '',
        item: debt.item || '',
        description: debt.description || '',
      },
    ])
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingDebt(null)
    setFormData({
      debtor: '',
      creditor: '',
    })
    setDebtItems([
      { id: crypto.randomUUID(), amount: '', item: '', description: '' },
    ])
  }

  const addDebtItem = () => {
    setDebtItems([
      ...debtItems,
      { id: crypto.randomUUID(), amount: '', item: '', description: '' },
    ])
  }

  const removeDebtItem = (id: string) => {
    if (debtItems.length === 1) {
      toast.error('최소 1개의 아이템이 필요합니다.')
      return
    }
    setDebtItems(debtItems.filter((item) => item.id !== id))
  }

  const updateDebtItem = (
    id: string,
    field: keyof Omit<DebtItem, 'id'>,
    value: string,
  ) => {
    setDebtItems(
      debtItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    )
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('debts').delete().eq('id', id)

      if (error) throw error

      toast.success('빚이 삭제되었습니다.')

      // 실시간 구독이 실패할 경우를 대비한 백업 새로고침
      setTimeout(() => fetchDebts(), 1000)
    } catch (error) {
      console.error('Error deleting debt:', error)
      toast.error('빚을 삭제하는데 실패했습니다.')
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

      toast.success(
        debt.isPaid ? '미납으로 변경되었습니다.' : '갚음으로 표시되었습니다.',
      )

      // 실시간 구독이 실패할 경우를 대비한 백업 새로고침
      setTimeout(() => fetchDebts(), 1000)
    } catch (error) {
      console.error('Error updating debt:', error)
      toast.error('빚 상태를 변경하는데 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">빚 관리</h1>
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
            <div className="bg-gray-800 rounded-lg shadow p-8 text-center text-gray-400">
              로딩 중...
            </div>
          ) : debts.length === 0 ? (
            <div className="bg-gray-800 rounded-lg shadow p-8 text-center text-gray-400">
              등록된 빚이 없습니다. 새 빚을 추가해보세요.
            </div>
          ) : (
            debts.map((debt) => (
              <div
                key={debt.id}
                className={`bg-gray-700 rounded-lg shadow p-6 ${
                  debt.isPaid ? 'opacity-60' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-lg text-red-400">
                        {debt.debtor}
                      </span>
                      <span className="text-gray-500">→</span>
                      <span className="font-semibold text-lg text-green-400">
                        {debt.creditor}
                      </span>
                      {debt.isPaid && (
                        <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded">
                          갚음
                        </span>
                      )}
                    </div>

                    <div className="text-gray-300 space-y-1">
                      {debt.amount && (
                        <p className="text-xl font-bold text-white">
                          {debt.amount.toLocaleString()}원
                        </p>
                      )}
                      {debt.item && (
                        <p className="text-gray-300">
                          <span className="font-medium">아이템:</span>{' '}
                          {debt.item}
                        </p>
                      )}
                      {debt.description && (
                        <p className="text-gray-400">
                          <span className="font-medium">설명:</span>{' '}
                          {debt.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
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
                      onClick={() => handleEdit(debt)}
                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                      title="수정"
                    >
                      <Edit2 size={20} />
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-white">
                {editingDebt ? '빚 수정' : '새 빚 추가'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    빚진 사람 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.debtor}
                    onChange={(e) =>
                      setFormData({ ...formData, debtor: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이름을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    빚을 받아야 하는 사람 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.creditor}
                    onChange={(e) =>
                      setFormData({ ...formData, creditor: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이름을 입력하세요"
                  />
                </div>

                {/* 아이템 목록 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-300">
                      아이템 목록
                    </label>
                    {!editingDebt && (
                      <button
                        type="button"
                        onClick={addDebtItem}
                        className="flex items-center gap-1 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                        아이템 추가
                      </button>
                    )}
                  </div>

                  {debtItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-gray-700 p-4 rounded-lg space-y-3 border border-gray-600"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-300">
                          아이템 {index + 1}
                        </span>
                        {!editingDebt && debtItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDebtItem(item.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          금액
                        </label>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) =>
                            updateDebtItem(item.id, 'amount', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="금액을 입력하세요"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          아이템명
                        </label>
                        <input
                          type="text"
                          value={item.item}
                          onChange={(e) =>
                            updateDebtItem(item.id, 'item', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="아이템 이름을 입력하세요"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          설명
                        </label>
                        <textarea
                          value={item.description}
                          onChange={(e) =>
                            updateDebtItem(
                              item.id,
                              'description',
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="추가 설명을 입력하세요"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingDebt ? '수정' : '추가'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
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
