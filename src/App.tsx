import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, Swords, Heart, ChevronRight } from 'lucide-react'
import type { Debt } from './types/debt'
import { supabase } from './lib/supabase'
import { getClassRole } from './utils/classUtils'
import AdventureIslands from './components/AdventureIslands'

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

interface ScheduleRow {
  id: number
  raid_name: string
  slot_1: string | null
  slot_2: string | null
  slot_3: string | null
  slot_4: string | null
  is_completed: boolean
  created_at: string
}

interface RaidSummary {
  id: number
  raidName: string
  slots: (string | null)[]
  isCompleted: boolean
  filledSlots: number
}

type SlotData = {
  name: string
  className: string
} | null

function parseSlotData(slotText: string | null): SlotData {
  if (!slotText) return null

  const parts = slotText.split(' / ')
  if (parts.length === 2) {
    return {
      name: parts[0].trim(),
      className: parts[1].trim(),
    }
  }

  return {
    name: slotText,
    className: '',
  }
}

export default function App() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [raids, setRaids] = useState<RaidSummary[]>([])
  const [isLoadingDebts, setIsLoadingDebts] = useState(true)
  const [isLoadingRaids, setIsLoadingRaids] = useState(true)

  useEffect(() => {
    fetchDebts()
    fetchRaids()

    // Debts 실시간 구독
    const debtsChannel = supabase
      .channel('debts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
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

    // Raids 실시간 구독
    const raidsChannel = supabase
      .channel('schedules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
        },
        () => {
          fetchRaids()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(debtsChannel)
      supabase.removeChannel(raidsChannel)
    }
  }, [])

  const fetchDebts = async () => {
    try {
      setIsLoadingDebts(true)
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
      setIsLoadingDebts(false)
    }
  }

  const fetchRaids = async () => {
    try {
      setIsLoadingRaids(true)
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      const formattedRaids: RaidSummary[] =
        (data as ScheduleRow[])?.map((row) => {
          const slots = [row.slot_1, row.slot_2, row.slot_3, row.slot_4]
          const filledSlots = slots.filter((slot) => slot !== null).length

          return {
            id: row.id,
            raidName: row.raid_name,
            slots,
            isCompleted: row.is_completed,
            filledSlots,
          }
        }) || []

      setRaids(formattedRaids)
    } catch (error) {
      console.error('Error fetching raids:', error)
    } finally {
      setIsLoadingRaids(false)
    }
  }

  const handleToggleRaidComplete = async (
    id: number,
    currentState: boolean,
  ) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ is_completed: !currentState })
        .eq('id', id)

      if (error) throw error

      setRaids((prev) => prev.filter((raid) => raid.id !== id))
    } catch (error) {
      console.error('Error updating schedule:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        <div className="grid grid-cols-[1fr_400px] gap-[10px]">
          {/* 레이드 스케줄 요약 */}
          <div className="w-full bg-gray-800 rounded-xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">미완료 레이드</h2>
              <Link
                to="/schedule"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                전체 보기
                <ChevronRight size={16} />
              </Link>
            </div>

            {isLoadingRaids ? (
              <div className="text-center py-12 text-gray-400">로딩 중...</div>
            ) : raids.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">
                  완료되지 않은 레이드가 없습니다.
                </p>
                <Link
                  to="/schedule"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  레이드 추가
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {raids.map((raid) => (
                  <div
                    key={raid.id}
                    className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4 flex-1">
                        <button
                          onClick={() =>
                            handleToggleRaidComplete(raid.id, raid.isCompleted)
                          }
                          className="p-2 bg-gray-600 hover:bg-green-600 text-gray-300 hover:text-white rounded-lg transition-colors flex-shrink-0"
                          title="완료 처리"
                        >
                          <Check size={18} />
                        </button>

                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-lg">
                            {raid.raidName}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-400">
                              {raid.filledSlots}/4 슬롯
                            </span>
                            <div className="flex gap-1">
                              {raid.slots.map((slot, idx) => {
                                const slotData = parseSlotData(slot)
                                if (!slotData) return null

                                const role = slotData.className
                                  ? getClassRole(slotData.className)
                                  : null
                                const Icon =
                                  role === 'support'
                                    ? Heart
                                    : role === 'dealer'
                                      ? Swords
                                      : null

                                if (!Icon) return null

                                return (
                                  <Icon
                                    key={idx}
                                    size={14}
                                    className={
                                      role === 'support'
                                        ? 'text-green-400'
                                        : 'text-red-400'
                                    }
                                  />
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="hidden md:flex gap-2">
                          {raid.slots.map((slot, idx) => {
                            const slotData = parseSlotData(slot)
                            if (!slotData) return null

                            const role = slotData.className
                              ? getClassRole(slotData.className)
                              : null
                            const Icon =
                              role === 'support'
                                ? Heart
                                : role === 'dealer'
                                  ? Swords
                                  : null

                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded text-sm"
                              >
                                {Icon && (
                                  <Icon
                                    size={12}
                                    className={
                                      role === 'support'
                                        ? 'text-green-400'
                                        : 'text-red-400'
                                    }
                                  />
                                )}
                                <span className="text-gray-300">
                                  {slotData.name}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 빚 목록 */}
          <div className="w-full bg-gray-800 rounded-xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">최근 빚 목록</h2>
              <Link
                to="/debts"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                전체 보기
                <ChevronRight size={16} />
              </Link>
            </div>

            {isLoadingDebts ? (
              <div className="text-center py-12 text-gray-400">로딩 중...</div>
            ) : debts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">등록된 빚이 없습니다.</p>
                <Link
                  to="/debts"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  빚 추가
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

        {/* 모험섬 컴포넌트 */}
        <AdventureIslands />
      </div>
    </div>
  )
}
