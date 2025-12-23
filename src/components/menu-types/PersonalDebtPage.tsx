import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, X, Edit2, User } from 'lucide-react'
import { toast } from 'sonner'
import type { Debt } from '../../types/debt'
import { supabase } from '../../lib/supabase'

// Supabase 데이터베이스 타입 정의
interface PersonalDebtRow {
  id: string
  user_id: string
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

interface PersonalDebtPageProps {
  userId: string
}

export default function PersonalDebtPage({ userId }: PersonalDebtPageProps) {
  const [debts, setDebts] = useState<Debt[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [formData, setFormData] = useState({
    debtor: '',
    creditor: '',
  })
  const [debtItems, setDebtItems] = useState<DebtItem[]>([
    { id: crypto.randomUUID(), amount: '', item: '', description: '' },
  ])

  // Supabase에서 개인 빚 목록 가져오기 및 실시간 구독
  useEffect(() => {
    fetchDebts()

    // Supabase 실시간 구독 설정 (개인 빚만)
    const channel = supabase
      .channel('personal-debts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personal_debts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Personal Debt realtime update:', payload)
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as PersonalDebtRow
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
            // 중복 방지: 이미 존재하는 빚인지 확인
            setDebts((prev) => {
              const exists = prev.some(debt => debt.id === newDebt.id)
              if (exists) return prev
              return [newDebt, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as PersonalDebtRow
            setDebts((prev) => {
              const exists = prev.some(debt => debt.id === updatedRow.id)
              if (!exists) return prev // 존재하지 않는 항목은 업데이트하지 않음
              
              return prev.map((debt) =>
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
              )
            })
          } else if (payload.eventType === 'DELETE') {
            const deletedRow = payload.old as PersonalDebtRow
            setDebts((prev) => {
              const exists = prev.some(debt => debt.id === deletedRow.id)
              if (!exists) return prev // 이미 삭제된 항목은 처리하지 않음
              
              return prev.filter((debt) => debt.id !== deletedRow.id)
            })
          }
        },
      )
      .subscribe((status) => {
        console.log('Personal Debt subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to personal debts realtime updates')
          setIsRealtimeConnected(true)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to personal debts realtime updates')
          setIsRealtimeConnected(false)
          toast.error('실시간 업데이트 연결에 실패했습니다.')
        } else if (status === 'CLOSED') {
          setIsRealtimeConnected(false)
          console.warn('Personal debts realtime connection closed')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const fetchDebts = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('personal_debts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedDebts: Debt[] =
        (data as PersonalDebtRow[])?.map((debt) => ({
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
      console.error('Error fetching personal debts:', error)
      toast.error('개인 빚 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingDebt) {
      await handleUpdate()
    } else {
      try {
        const debtsToInsert = debtItems.map((item) => ({
          user_id: userId,
          debtor: formData.debtor,
          creditor: formData.creditor,
          amount: item.amount ? parseFloat(item.amount) : null,
          item: item.item || null,
          description: item.description || null,
        }))

        const { error } = await supabase.from('personal_debts').insert(debtsToInsert)

        if (error) throw error

        toast.success(`${debtItems.length}개의 개인 빚이 추가되었습니다.`)

        // 실시간 연결이 끊어진 경우 백업 새로고침
        if (!isRealtimeConnected) {
          setTimeout(() => fetchDebts(), 1000)
        }

        setFormData({
          debtor: '',
          creditor: '',
        })
        setDebtItems([
          { id: crypto.randomUUID(), amount: '', item: '', description: '' },
        ])
        setIsFormOpen(false)
      } catch (error) {
        console.error('Error creating personal debt:', error)
        toast.error('개인 빚을 추가하는데 실패했습니다.')
      }
    }
  }

  const handleUpdate = async () => {
    if (!editingDebt) return

    try {
      const firstItem = debtItems[0]
      const { error } = await supabase
        .from('personal_debts')
        .update({
          debtor: formData.debtor,
          creditor: formData.creditor,
          amount: firstItem.amount ? parseFloat(firstItem.amount) : null,
          item: firstItem.item || null,
          description: firstItem.description || null,
        })
        .eq('id', editingDebt.id)

      if (error) throw error

      toast.success('개인 빚이 수정되었습니다.')

      // 실시간 연결이 끊어진 경우 백업 새로고침
      if (!isRealtimeConnected) {
        setTimeout(() => fetchDebts(), 1000)
      }

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
      console.error('Error updating personal debt:', error)
      toast.error('개인 빚을 수정하는데 실패했습니다.')
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
      // 즉시 로컬 상태 업데이트 (낙관적 업데이트)
      setDebts((prev) => prev.filter((debt) => debt.id !== id))

      const { error } = await supabase
        .from('personal_debts')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('개인 빚이 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting personal debt:', error)
      toast.error('개인 빚을 삭제하는데 실패했습니다.')
      
      // 삭제 실패 시 데이터 다시 불러오기
      fetchDebts()
    }
  }

  const togglePaid = async (id: string) => {
    const debt = debts.find((d) => d.id === id)
    if (!debt) return

    const newPaidState = !debt.isPaid

    try {
      // 즉시 로컬 상태 업데이트 (낙관적 업데이트)
      setDebts((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, isPaid: newPaidState } : d
        )
      )

      const { error } = await supabase
        .from('personal_debts')
        .update({ is_paid: newPaidState })
        .eq('id', id)

      if (error) throw error

      toast.success(
        debt.isPaid ? '미납으로 변경되었습니다.' : '갚음으로 표시되었습니다.',
      )
    } catch (error) {
      console.error('Error updating personal debt:', error)
      toast.error('개인 빚 상태를 변경하는데 실패했습니다.')
      
      // 업데이트 실패 시 원래 상태로 되돌리기
      setDebts((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, isPaid: debt.isPaid } : d
        )
      )
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">개인 빚 관리</h2>
            {/* 실시간 연결 상태 인디케이터 */}
            <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                 title={isRealtimeConnected ? '실시간 연결됨' : '실시간 연결 끊김'} />
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />새 빚 추가
          </button>
        </div>

        {/* 빚 목록 */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-muted rounded-lg shadow p-8 text-center text-muted-foreground">
              로딩 중...
            </div>
          ) : debts.length === 0 ? (
            <div className="bg-muted rounded-lg shadow p-8 text-center text-muted-foreground">
              등록된 개인 빚이 없습니다. 새 빚을 추가해보세요.
            </div>
          ) : (
            debts.map((debt) => (
              <div
                key={debt.id}
                className={`bg-card border border-border rounded-lg shadow-sm p-6 ${
                  debt.isPaid ? 'opacity-60' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-lg text-red-500">
                        {debt.debtor}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-semibold text-lg text-green-500">
                        {debt.creditor}
                      </span>
                      {debt.isPaid && (
                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded">
                          갚음
                        </span>
                      )}
                    </div>

                    <div className="text-foreground space-y-1">
                      {debt.amount && (
                        <p className="text-xl font-bold text-foreground">
                          {debt.amount.toLocaleString()}원
                        </p>
                      )}
                      {debt.item && (
                        <p className="text-foreground">
                          <span className="font-medium">아이템:</span>{' '}
                          {debt.item}
                        </p>
                      )}
                      {debt.description && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">설명:</span>{' '}
                          {debt.description}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {new Date(debt.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => togglePaid(debt.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        debt.isPaid
                          ? 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                      }`}
                      title={debt.isPaid ? '미납으로 변경' : '갚음으로 표시'}
                    >
                      {debt.isPaid ? <X size={20} /> : <Check size={20} />}
                    </button>
                    <button
                      onClick={() => handleEdit(debt)}
                      className="p-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
                      title="수정"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(debt.id)}
                      className="p-2 bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-lg transition-colors"
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
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4 text-foreground">
                {editingDebt ? '개인 빚 수정' : '새 개인 빚 추가'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    빚진 사람 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.debtor}
                    onChange={(e) =>
                      setFormData({ ...formData, debtor: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="이름을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    빚을 받아야 하는 사람 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.creditor}
                    onChange={(e) =>
                      setFormData({ ...formData, creditor: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="이름을 입력하세요"
                  />
                </div>

                {/* 아이템 목록 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-foreground">
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
                      className="bg-muted p-4 rounded-lg space-y-3 border border-border"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-foreground">
                          아이템 {index + 1}
                        </span>
                        {!editingDebt && debtItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDebtItem(item.id)}
                            className="text-destructive hover:text-destructive/80 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          금액
                        </label>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) =>
                            updateDebtItem(item.id, 'amount', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          placeholder="금액을 입력하세요"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          아이템명
                        </label>
                        <input
                          type="text"
                          value={item.item}
                          onChange={(e) =>
                            updateDebtItem(item.id, 'item', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          placeholder="아이템 이름을 입력하세요"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
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
                          className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
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
                    className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {editingDebt ? '수정' : '추가'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="flex-1 bg-muted text-muted-foreground px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors"
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