import type { Database } from './database'

export type ScheduleRow = Database['public']['Tables']['schedules']['Row']

export type RaidSchedule = {
  id: number
  raidName: string
  slots: (string | null)[]
  combatPowers: (number | null)[]
  isCompleted: boolean
  createdAt: Date
  averageStats?: number
}

export type SlotData = {
  name: string
  className: string
  stats?: number
} | null

export type SortField = 'raidName' | 'isCompleted' | 'createdAt'
export type SortDirection = 'asc' | 'desc' | null
export type FilterCompleted = 'all' | 'completed' | 'incomplete'

export type ScheduleFilters = {
  raidName: string
  completed: FilterCompleted
  character: string
}

export type ScheduleSort = {
  field: SortField | null
  direction: SortDirection
}
