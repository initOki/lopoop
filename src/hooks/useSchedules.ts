import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { RaidSchedule, ScheduleRow } from '@/types/schedule'
import { rowToSchedule, getNextWednesday6AM } from '@/utils/scheduleUtils'

const LAST_RESET_KEY = 'raid_schedule_last_reset'

export function useSchedules() {
  const [schedules, setSchedules] = useState<RaidSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 매주 수요일 오전 6시 체크 및 초기화
  const checkAndResetIfNeeded = () => {
    const now = new Date()
    const lastReset = localStorage.getItem(LAST_RESET_KEY)

    if (!lastReset) {
      localStorage.setItem(LAST_RESET_KEY, now.toISOString())
      return
    }

    const lastResetDate = new Date(lastReset)
    const nextWednesday = getNextWednesday6AM(lastResetDate)

    if (now >= nextWednesday) {
      resetAllCompletions()
      localStorage.setItem(LAST_RESET_KEY, now.toISOString())
    }
  }

  // 모든 완료 상태 초기화
  const resetAllCompletions = async () => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ is_completed: false })
        .neq('id', 0)

      if (error) throw error

      toast.success('주간 레이드가 초기화되었습니다.')
    } catch (error) {
      console.error('Error resetting completions:', error)
    }
  }

  // 수동 초기화
  const handleManualReset = async () => {
    if (!confirm('모든 레이드 완료 상태를 초기화하시겠습니까?')) return

    await resetAllCompletions()
    localStorage.setItem(LAST_RESET_KEY, new Date().toISOString())
  }

  const fetchSchedules = async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formatted: RaidSchedule[] = (data || []).map(rowToSchedule)
      setSchedules(formatted)
    } catch (error) {
      console.error('Error fetching schedules:', error)
      toast.error('스케줄을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteSchedule = async (id: number) => {
    if (!confirm('이 레이드 스케줄을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id)

      if (error) throw error

      toast.success('레이드 스케줄이 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting schedule:', error)
      toast.error('레이드 스케줄 삭제에 실패했습니다.')
    }
  }

  const toggleComplete = async (id: number, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ is_completed: !currentState })
        .eq('id', id)

      if (error) throw error

      toast.success(
        currentState ? '미완료로 변경되었습니다.' : '완료 처리되었습니다.',
      )
    } catch (error) {
      console.error('Error updating schedule:', error)
      toast.error('상태 변경에 실패했습니다.')
    }
  }

  useEffect(() => {
    checkAndResetIfNeeded()
    fetchSchedules()

    // 실시간 구독
    const channel = supabase
      .channel('schedules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as ScheduleRow
            setSchedules((prev) => [rowToSchedule(newRow), ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as ScheduleRow
            setSchedules((prev) =>
              prev.map((s) =>
                s.id === updatedRow.id ? rowToSchedule(updatedRow) : s,
              ),
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedRow = payload.old as ScheduleRow
            setSchedules((prev) => prev.filter((s) => s.id !== deletedRow.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    schedules,
    isLoading,
    deleteSchedule,
    toggleComplete,
    handleManualReset,
  }
}
