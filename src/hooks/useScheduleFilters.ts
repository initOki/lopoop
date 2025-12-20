import { useState, useMemo } from 'react'
import type {
  RaidSchedule,
  ScheduleFilters,
  ScheduleSort,
  SortField,
} from '@/types/schedule'

export function useScheduleFilters(schedules: RaidSchedule[]) {
  const [filters, setFilters] = useState<ScheduleFilters>({
    raidName: '',
    completed: 'all',
    character: '',
  })

  const [sort, setSort] = useState<ScheduleSort>({
    field: null,
    direction: null,
  })

  // 필터링 및 정렬된 스케줄
  const filteredAndSortedSchedules = useMemo(() => {
    let result = [...schedules]

    // 필터링
    if (filters.raidName) {
      result = result.filter((s) =>
        s.raidName.toLowerCase().includes(filters.raidName.toLowerCase()),
      )
    }

    if (filters.completed !== 'all') {
      result = result.filter((s) =>
        filters.completed === 'completed' ? s.isCompleted : !s.isCompleted,
      )
    }

    if (filters.character) {
      result = result.filter((s) =>
        s.slots.some((slot) =>
          slot?.toLowerCase().includes(filters.character.toLowerCase()),
        ),
      )
    }

    // 정렬
    if (sort.field && sort.direction) {
      result.sort((a, b) => {
        let compareValue = 0

        switch (sort.field) {
          case 'raidName':
            compareValue = a.raidName.localeCompare(b.raidName)
            break
          case 'isCompleted':
            compareValue = (a.isCompleted ? 1 : 0) - (b.isCompleted ? 1 : 0)
            break
          case 'createdAt':
            compareValue = a.createdAt.getTime() - b.createdAt.getTime()
            break
        }

        return sort.direction === 'asc' ? compareValue : -compareValue
      })
    }

    return result
  }, [schedules, filters, sort])

  // 정렬 토글 핸들러
  const handleSort = (field: SortField) => {
    if (sort.field === field) {
      // 같은 필드 클릭: asc -> desc -> null
      if (sort.direction === 'asc') {
        setSort({ field, direction: 'desc' })
      } else if (sort.direction === 'desc') {
        setSort({ field: null, direction: null })
      }
    } else {
      // 다른 필드 클릭: asc로 시작
      setSort({ field, direction: 'asc' })
    }
  }

  const updateFilter = (key: keyof ScheduleFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return {
    filters,
    sort,
    filteredAndSortedSchedules,
    handleSort,
    updateFilter,
  }
}
