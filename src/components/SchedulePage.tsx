import { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Trash2,
  Check,
  RefreshCw,
  AlertCircle,
  Heart,
  Swords,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  X,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { raidList } from '@/lib/raid-list'
import RaidSetup from '@/features/raidSetup/RaidSetup'
import type { ExpeditionCharacter } from '@/types/loa'
import type { Database } from '@/types/database'
import { getClassRole, formatCharacterForTable } from '@/utils/classUtils'
import AccountSearch from '@/features/characterSearch/AccountSearch'
import {
  serializeRaidSetupState,
  deserializeRaidSetupState,
} from '@/features/raidSetup/filterUtils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ScheduleRow = Database['public']['Tables']['schedules']['Row']

type RaidSchedule = {
  id: number
  raidName: string
  slots: (string | null)[]
  isCompleted: boolean
  createdAt: Date
}

// 슬롯 데이터 파싱
type SlotData = {
  name: string
  className: string
} | null

function parseSlotData(slotText: string | null): SlotData {
  if (!slotText) return null

  // "캐릭터이름 / 직업" 형식으로 저장된 경우
  const parts = slotText.split(' / ')
  if (parts.length === 2) {
    return {
      name: parts[0].trim(),
      className: parts[1].trim(),
    }
  }

  // 이름만 저장된 경우 (하위 호환성)
  return {
    name: slotText,
    className: '',
  }
}

const LAST_RESET_KEY = 'raid_schedule_last_reset'
const RAID_SETUP_STATE_KEY = 'raid_setup_state'

type SortField = 'raidName' | 'isCompleted' | 'createdAt'
type SortDirection = 'asc' | 'desc' | null

export default function RaidSchedulePage() {
  const [schedules, setSchedules] = useState<RaidSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 새 레이드 추가 상태 - 이제 RaidSetup에서 관리
  const [selectedRaid, setSelectedRaid] = useState('')
  const [selectedSlots, setSelectedSlots] = useState<
    (ExpeditionCharacter | null)[]
  >([null, null, null, null])

  // 편집 모드 상태
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(
    null,
  )
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null)
  const [editCharacters, setEditCharacters] = useState<ExpeditionCharacter[]>(
    [],
  )
  const [selectedEditCharacter, setSelectedEditCharacter] =
    useState<ExpeditionCharacter | null>(null)

  // 필터 및 정렬 상태
  const [filterRaidName, setFilterRaidName] = useState('')
  const [filterCompleted, setFilterCompleted] = useState<
    'all' | 'completed' | 'incomplete'
  >('all')
  const [filterCharacter, setFilterCharacter] = useState('')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // 초기 상태 복원
  useEffect(() => {
    const savedState = localStorage.getItem(RAID_SETUP_STATE_KEY)
    if (savedState) {
      const restoredState = deserializeRaidSetupState(savedState)
      if (restoredState) {
        // 레이드 선택 복원
        setSelectedRaid(restoredState.selectedRaid)
        // 슬롯 선택 복원
        setSelectedSlots(restoredState.selectedSlots)
      }
    }
  }, [])

  // 상태 변경 시 저장
  useEffect(() => {
    if (selectedRaid || selectedSlots.some((slot) => slot !== null)) {
      const serialized = serializeRaidSetupState(selectedRaid, selectedSlots)
      if (serialized) {
        localStorage.setItem(RAID_SETUP_STATE_KEY, serialized)
      }
    }
  }, [selectedRaid, selectedSlots])

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

  // 다음 수요일 오전 6시 계산
  const getNextWednesday6AM = (fromDate: Date): Date => {
    const date = new Date(fromDate)
    const dayOfWeek = date.getDay()
    const daysUntilWednesday = (3 - dayOfWeek + 7) % 7 || 7

    date.setDate(date.getDate() + daysUntilWednesday)
    date.setHours(6, 0, 0, 0)

    return date
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

  const rowToSchedule = (row: ScheduleRow): RaidSchedule => ({
    id: row.id,
    raidName: row.raid_name,
    slots: [row.slot_1, row.slot_2, row.slot_3, row.slot_4],
    isCompleted: row.is_completed,
    createdAt: new Date(row.created_at),
  })

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

  // 레이드 입장 레벨 체크
  const checkItemLevelRequirement = (): {
    valid: boolean
    invalidSlots: number[]
  } => {
    if (!selectedRaid) return { valid: true, invalidSlots: [] }

    const selectedRaidInfo = raidList.find((r) => r.name === selectedRaid)
    if (!selectedRaidInfo) return { valid: true, invalidSlots: [] }

    const invalidSlots: number[] = []

    selectedSlots.forEach((slot, idx) => {
      if (slot && slot.ItemLevel < selectedRaidInfo.minItemLevel) {
        invalidSlots.push(idx + 1)
      }
    })

    return {
      valid: invalidSlots.length === 0,
      invalidSlots,
    }
  }

  const handleAddSchedule = async () => {
    if (!selectedRaid) {
      toast.error('레이드를 선택해주세요.')
      return
    }

    // 입장 레벨 체크
    const { valid, invalidSlots } = checkItemLevelRequirement()

    if (!valid) {
      const selectedRaidInfo = raidList.find((r) => r.name === selectedRaid)
      toast.error(
        `슬롯 ${invalidSlots.join(', ')}의 캐릭터가 입장 레벨(${selectedRaidInfo?.minItemLevel})에 미달합니다.`,
      )
      return
    }

    // 캐릭터 3회 등록 체크
    const overusedCharacters: string[] = []
    selectedSlots.forEach((slot) => {
      if (slot) {
        const usageCount = getCharacterUsageCount(slot.CharacterName)
        if (usageCount >= 3) {
          overusedCharacters.push(slot.CharacterName)
        }
      }
    })

    if (overusedCharacters.length > 0) {
      toast.error(
        `${overusedCharacters.join(', ')}은(는) 이미 3회 등록되어 있어 더 이상 추가할 수 없습니다.`,
      )
      return
    }

    try {
      const { error } = await supabase.from('schedules').insert({
        raid_name: selectedRaid,
        slot_1: selectedSlots[0]
          ? formatCharacterForTable(
              selectedSlots[0].CharacterName,
              selectedSlots[0].CharacterClassName,
            )
          : null,
        slot_2: selectedSlots[1]
          ? formatCharacterForTable(
              selectedSlots[1].CharacterName,
              selectedSlots[1].CharacterClassName,
            )
          : null,
        slot_3: selectedSlots[2]
          ? formatCharacterForTable(
              selectedSlots[2].CharacterName,
              selectedSlots[2].CharacterClassName,
            )
          : null,
        slot_4: selectedSlots[3]
          ? formatCharacterForTable(
              selectedSlots[3].CharacterName,
              selectedSlots[3].CharacterClassName,
            )
          : null,
      })

      if (error) throw error

      toast.success('레이드 스케줄이 추가되었습니다.')
      setSelectedRaid('')
      setSelectedSlots([null, null, null, null])
    } catch (error) {
      console.error('Error adding schedule:', error)
      toast.error('레이드 스케줄 추가에 실패했습니다.')
    }
  }

  const handleDeleteSchedule = async (id: number) => {
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

  const handleToggleComplete = async (id: number, currentState: boolean) => {
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

  // 슬롯 편집 시작
  const handleStartEditSlot = (scheduleId: number, slotIndex: number) => {
    setEditingScheduleId(scheduleId)
    setEditingSlotIndex(slotIndex)
    setEditCharacters([])
    setSelectedEditCharacter(null)
  }

  // 슬롯 편집 취소
  const handleCancelEdit = () => {
    setEditingScheduleId(null)
    setEditingSlotIndex(null)
    setEditCharacters([])
    setSelectedEditCharacter(null)
  }

  // 캐릭터가 현재 스케줄에 몇 번 등록되어 있는지 확인
  const getCharacterUsageCount = (
    characterName: string,
    excludeScheduleId?: number,
    excludeSlotIndex?: number,
  ) => {
    let count = 0
    schedules.forEach((schedule) => {
      schedule.slots.forEach((slot, idx) => {
        // 현재 편집 중인 슬롯은 제외
        if (excludeScheduleId === schedule.id && excludeSlotIndex === idx) {
          return
        }

        const slotData = parseSlotData(slot)
        if (slotData && slotData.name === characterName) {
          count++
        }
      })
    })
    return count
  }

  // 슬롯 업데이트
  const handleUpdateSlot = async (scheduleId: number, slotIndex: number) => {
    if (!selectedEditCharacter) {
      toast.error('캐릭터를 선택해주세요.')
      return
    }

    // 캐릭터 사용 횟수 체크 (현재 편집 중인 슬롯 제외)
    const usageCount = getCharacterUsageCount(
      selectedEditCharacter.CharacterName,
      scheduleId,
      slotIndex,
    )
    if (usageCount >= 3) {
      toast.error(
        `${selectedEditCharacter.CharacterName}은(는) 이미 3회 등록되어 있어 더 이상 추가할 수 없습니다.`,
      )
      return
    }

    const schedule = schedules.find((s) => s.id === scheduleId)
    if (!schedule) return

    // 레이드 입장 레벨 체크
    const selectedRaid = raidList.find((r) => r.name === schedule.raidName)
    if (
      selectedRaid &&
      selectedEditCharacter.ItemLevel < selectedRaid.minItemLevel
    ) {
      toast.error(
        `선택한 캐릭터의 아이템 레벨(${selectedEditCharacter.ItemLevel})이 레이드 입장 레벨(${selectedRaid.minItemLevel})에 미달합니다.`,
      )
      return
    }

    try {
      const slotKey = `slot_${slotIndex + 1}` as
        | 'slot_1'
        | 'slot_2'
        | 'slot_3'
        | 'slot_4'
      const { error } = await supabase
        .from('schedules')
        .update({
          [slotKey]: formatCharacterForTable(
            selectedEditCharacter.CharacterName,
            selectedEditCharacter.CharacterClassName,
          ),
        })
        .eq('id', scheduleId)

      if (error) throw error

      toast.success('캐릭터가 변경되었습니다.')
      handleCancelEdit()
    } catch (error) {
      console.error('Error updating slot:', error)
      toast.error('캐릭터 변경에 실패했습니다.')
    }
  }

  // 슬롯 비우기
  const handleClearSlot = async (scheduleId: number, slotIndex: number) => {
    if (!confirm('이 슬롯을 비우시겠습니까?')) return

    try {
      const slotKey = `slot_${slotIndex + 1}` as
        | 'slot_1'
        | 'slot_2'
        | 'slot_3'
        | 'slot_4'
      const { error } = await supabase
        .from('schedules')
        .update({ [slotKey]: null })
        .eq('id', scheduleId)

      if (error) throw error

      toast.success('슬롯이 비워졌습니다.')
    } catch (error) {
      console.error('Error clearing slot:', error)
      toast.error('슬롯 비우기에 실패했습니다.')
    }
  }

  // 현재 선택된 레이드의 입장 레벨 정보
  const getSelectedRaidInfo = () => {
    if (!selectedRaid) return null
    return raidList.find((r) => r.name === selectedRaid)
  }

  // 슬롯별 입장 가능 여부 체크
  const getSlotStatus = (
    slot: ExpeditionCharacter | null,
    minLevel: number,
  ) => {
    if (!slot) return null
    return slot.ItemLevel >= minLevel
  }

  const selectedRaidInfo = getSelectedRaidInfo()

  // 필터링 및 정렬된 스케줄
  const filteredAndSortedSchedules = useMemo(() => {
    let result = [...schedules]

    // 필터링
    if (filterRaidName) {
      result = result.filter((s) =>
        s.raidName.toLowerCase().includes(filterRaidName.toLowerCase()),
      )
    }

    if (filterCompleted !== 'all') {
      result = result.filter((s) =>
        filterCompleted === 'completed' ? s.isCompleted : !s.isCompleted,
      )
    }

    if (filterCharacter) {
      result = result.filter((s) =>
        s.slots.some((slot) =>
          slot?.toLowerCase().includes(filterCharacter.toLowerCase()),
        ),
      )
    }

    // 정렬
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let compareValue = 0

        switch (sortField) {
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

        return sortDirection === 'asc' ? compareValue : -compareValue
      })
    }

    return result
  }, [
    schedules,
    filterRaidName,
    filterCompleted,
    filterCharacter,
    sortField,
    sortDirection,
  ])

  // 정렬 토글 핸들러
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 같은 필드 클릭: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
        setSortField(null)
      }
    } else {
      // 다른 필드 클릭: asc로 시작
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // 정렬 아이콘 렌더링
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={16} className="text-gray-500" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp size={16} className="text-blue-400" />
    }
    return <ArrowDown size={16} className="text-blue-400" />
  }

  // 슬롯 렌더링 컴포넌트
  const SlotCell = ({
    scheduleId,
    slotIndex,
    slotText,
  }: {
    scheduleId: number
    slotIndex: number
    slotText: string | null
  }) => {
    const slotData = parseSlotData(slotText)

    const isEditing =
      editingScheduleId === scheduleId && editingSlotIndex === slotIndex

    if (isEditing) {
      return (
        <div className="space-y-2">
          <AccountSearch
            expeditionIndex={1}
            onResult={(chars) => {
              setEditCharacters(chars)
              if (chars.length > 0) {
                // 첫 번째 캐릭터가 3회 이상 등록되어 있으면 선택 가능한 첫 캐릭터 찾기
                const firstAvailableChar = chars.find(
                  (c) =>
                    getCharacterUsageCount(
                      c.CharacterName,
                      scheduleId,
                      slotIndex,
                    ) < 3,
                )
                setSelectedEditCharacter(firstAvailableChar ?? null)
              }
            }}
          />
          {editCharacters.length > 0 && (
            <Select
              value={selectedEditCharacter?.CharacterName ?? ''}
              onValueChange={(characterName) => {
                const char =
                  editCharacters.find(
                    (c) => c.CharacterName === characterName,
                  ) ?? null
                setSelectedEditCharacter(char)
              }}
            >
              <SelectTrigger className="w-full bg-zinc-700 text-white border-gray-600 text-sm h-8">
                <SelectValue placeholder="캐릭터 선택" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-gray-600">
                {editCharacters
                  .sort((a, b) => b.ItemLevel - a.ItemLevel)
                  .map((c) => {
                    const usageCount = getCharacterUsageCount(
                      c.CharacterName,
                      scheduleId,
                      slotIndex,
                    )
                    const isDisabled = usageCount >= 3
                    return (
                      <SelectItem
                        key={c.CharacterName}
                        value={c.CharacterName}
                        disabled={isDisabled}
                        className={
                          isDisabled
                            ? 'text-gray-500 data-[disabled]:opacity-50'
                            : 'text-white'
                        }
                      >
                        {c.CharacterName} / {c.CharacterClassName} (
                        {c.ItemLevel.toLocaleString()})
                        {isDisabled ? ' - 3회 등록됨' : ''}
                      </SelectItem>
                    )
                  })}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-1">
            <button
              onClick={() => handleUpdateSlot(scheduleId, slotIndex)}
              className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
              title="저장"
            >
              <Save size={14} />
              저장
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex-1 flex items-center justify-center gap-1 bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs transition-colors"
              title="취소"
            >
              <X size={14} />
              취소
            </button>
          </div>
        </div>
      )
    }

    if (!slotData) {
      return (
        <div className="flex items-center justify-between">
          <span className="text-gray-500 mr-[10px]">-</span>
          <button
            onClick={() => handleStartEditSlot(scheduleId, slotIndex)}
            className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            title="캐릭터 추가"
          >
            <Edit2 size={14} />
          </button>
        </div>
      )
    }

    const role = slotData.className ? getClassRole(slotData.className) : null
    const Icon = role === 'support' ? Heart : Swords

    return (
      <>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {role && (
              <Icon
                size={16}
                className={
                  role === 'support' ? 'text-green-400' : 'text-red-400'
                }
              />
            )}
            <span>
              {slotData.name} / {slotData.className || '미상'}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => handleStartEditSlot(scheduleId, slotIndex)}
              className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              title="캐릭터 변경"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => handleClearSlot(scheduleId, slotIndex)}
              className="p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              title="슬롯 비우기"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">레이드 스케줄 관리</h1>
          <button
            onClick={handleManualReset}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={18} />
            완료 상태 초기화
          </button>
        </div>

        {/* 캐릭터 검색 및 선택 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            캐릭터 검색 및 선택
          </h2>
          <RaidSetup
            selectedSlots={selectedSlots}
            onSlotsChange={setSelectedSlots}
            selectedRaid={selectedRaid}
            onRaidChange={setSelectedRaid}
            getCharacterUsageCount={getCharacterUsageCount}
          />
        </div>

        {/* 레이드 추가 섹션 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">레이드 추가</h2>

          {/* 현재 선택된 슬롯 미리보기 (입장 가능 여부 표시) */}
          <div className="mt-4 grid grid-cols-4 gap-3">
            {selectedSlots.map((slot, idx) => {
              const canEnter = selectedRaidInfo
                ? getSlotStatus(slot, selectedRaidInfo.minItemLevel)
                : null

              const role = slot ? getClassRole(slot.CharacterClassName) : null
              const Icon =
                role === 'support' ? Heart : role === 'dealer' ? Swords : null

              return (
                <div
                  key={idx}
                  className={`rounded px-3 py-2 text-sm border ${
                    canEnter === false
                      ? 'bg-red-900/30 border-red-600'
                      : canEnter === true
                        ? 'bg-green-900/30 border-green-600'
                        : 'bg-gray-700 border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">슬롯 {idx + 1}:</span>
                    <div className="flex items-center gap-1">
                      {Icon && (
                        <Icon
                          size={14}
                          className={
                            role === 'support'
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        />
                      )}
                      {canEnter === false && (
                        <AlertCircle size={14} className="text-red-400" />
                      )}
                      {slot && (
                        <button
                          onClick={() => {
                            const newSlots = [...selectedSlots]
                            newSlots[idx] = null
                            setSelectedSlots(newSlots)
                          }}
                          className="p-0.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          title="캐릭터 제거"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1">
                    {slot ? (
                      <>
                        <div className="text-white font-medium">
                          {slot.CharacterName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {slot.CharacterClassName}
                        </div>
                        <div
                          className={`text-xs ${
                            canEnter === false
                              ? 'text-red-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {slot.ItemLevel.toLocaleString()}
                          {selectedRaidInfo &&
                            ` / ${selectedRaidInfo.minItemLevel}`}
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500">미선택</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-center mt-[14px]">
            {/* 추가 버튼 */}
            <button
              onClick={handleAddSchedule}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={19} />
              레이드 추가
            </button>
          </div>

          {/* 입장 불가 경고 */}
          {selectedRaidInfo &&
            checkItemLevelRequirement().invalidSlots.length > 0 && (
              <div className="mt-4 flex items-start gap-2 bg-red-900/20 border border-red-600 rounded-lg px-4 py-3">
                <AlertCircle
                  size={20}
                  className="text-red-400 flex-shrink-0 mt-0.5"
                />
                <div className="text-sm">
                  <p className="text-red-400 font-medium">입장 레벨 미달</p>
                  <p className="text-red-300 mt-1">
                    슬롯 {checkItemLevelRequirement().invalidSlots.join(', ')}의
                    캐릭터가 입장 레벨({selectedRaidInfo.minItemLevel})에
                    미달합니다.
                  </p>
                </div>
              </div>
            )}
        </div>

        {/* 필터 섹션 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            필터 및 검색
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 레이드 이름 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                레이드 이름
              </label>
              <input
                type="text"
                value={filterRaidName}
                onChange={(e) => setFilterRaidName(e.target.value)}
                placeholder="레이드 이름 검색..."
                className="w-full rounded bg-zinc-700 px-3 py-2 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 캐릭터 이름 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                캐릭터 이름
              </label>
              <input
                type="text"
                value={filterCharacter}
                onChange={(e) => setFilterCharacter(e.target.value)}
                placeholder="캐릭터 이름 검색..."
                className="w-full rounded bg-zinc-700 px-3 py-2 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 완료 상태 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                완료 상태
              </label>
              <Select
                value={filterCompleted}
                onValueChange={(value) =>
                  setFilterCompleted(
                    value as 'all' | 'completed' | 'incomplete',
                  )
                }
              >
                <SelectTrigger className="!h-auto py-[10px] w-full bg-zinc-700 text-white border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-gray-600">
                  <SelectItem value="all" className="text-white">
                    전체
                  </SelectItem>
                  <SelectItem value="completed" className="text-white">
                    완료
                  </SelectItem>
                  <SelectItem value="incomplete" className="text-white">
                    미완료
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 레이드 스케줄 테이블 */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300 w-16">
                  <button
                    onClick={() => handleSort('isCompleted')}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    완료
                    <SortIcon field="isCompleted" />
                  </button>
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300">
                  <button
                    onClick={() => handleSort('raidName')}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    레이드 종류
                    <SortIcon field="raidName" />
                  </button>
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300">
                  슬롯 1
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300">
                  슬롯 2
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300">
                  슬롯 3
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300">
                  슬롯 4
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300 w-16">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    로딩 중...
                  </td>
                </tr>
              ) : filteredAndSortedSchedules.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    {schedules.length === 0
                      ? '등록된 레이드 스케줄이 없습니다.'
                      : '검색 결과가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedSchedules.map((schedule) => (
                  <tr
                    key={schedule.id}
                    className={`hover:bg-gray-750 transition-colors ${
                      schedule.isCompleted ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() =>
                          handleToggleComplete(
                            schedule.id,
                            schedule.isCompleted,
                          )
                        }
                        className={`p-2 rounded-lg transition-colors ${
                          schedule.isCompleted
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                        }`}
                        title={schedule.isCompleted ? '완료 취소' : '완료 처리'}
                      >
                        <Check size={18} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-white font-medium text-center">
                      {schedule.raidName}
                    </td>
                    {schedule.slots.map((slot, idx) => (
                      <td
                        key={idx}
                        className="px-6 py-4 text-gray-300 text-center"
                      >
                        <div className="flex justify-center">
                          <SlotCell
                            scheduleId={schedule.id}
                            slotIndex={idx}
                            slotText={slot}
                          />
                        </div>
                      </td>
                    ))}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="inline-flex items-center justify-center p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 안내 문구 */}
        <div className="mt-4 text-sm text-gray-400 space-y-1">
          <p>
            💡 캐릭터를 검색하고 슬롯에 선택한 후, 레이드 종류를 선택하여
            추가하세요.
          </p>
          <p>
            ⚠️ 선택한 캐릭터의 아이템 레벨이 레이드 입장 레벨보다 낮으면 추가할
            수 없습니다.
          </p>
          <p>🔄 매주 수요일 오전 6시에 완료 상태가 자동으로 초기화됩니다.</p>
        </div>
      </div>
    </div>
  )
}
