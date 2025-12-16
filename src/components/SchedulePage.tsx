import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, RefreshCw, AlertCircle, Heart, Swords } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { raidList } from '@/lib/raid-list'
import RaidSetup from '@/features/raidSetup/RaidSetup'
import type { ExpeditionCharacter } from '@/types/loa'
import type { Database } from '@/types/database'
import { getClassRole, formatCharacterForTable } from '@/utils/classUtils'

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
      className: parts[1].trim()
    }
  }
  
  // 이름만 저장된 경우 (하위 호환성)
  return {
    name: slotText,
    className: ''
  }
}

const LAST_RESET_KEY = 'raid_schedule_last_reset'

export default function RaidSchedulePage() {
  const [schedules, setSchedules] = useState<RaidSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // 새 레이드 추가 상태
  const [newRaid, setNewRaid] = useState('')
  const [selectedSlots, setSelectedSlots] = useState<(ExpeditionCharacter | null)[]>([
    null,
    null,
    null,
    null,
  ])

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
              prev.map((s) => (s.id === updatedRow.id ? rowToSchedule(updatedRow) : s))
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedRow = payload.old as ScheduleRow
            setSchedules((prev) => prev.filter((s) => s.id !== deletedRow.id))
          }
        }
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
  const checkItemLevelRequirement = (): { valid: boolean; invalidSlots: number[] } => {
    if (!newRaid) return { valid: true, invalidSlots: [] }

    const selectedRaid = raidList.find(r => r.name === newRaid)
    if (!selectedRaid) return { valid: true, invalidSlots: [] }

    const invalidSlots: number[] = []

    selectedSlots.forEach((slot, idx) => {
      if (slot && slot.ItemLevel < selectedRaid.minItemLevel) {
        invalidSlots.push(idx + 1)
      }
    })

    return {
      valid: invalidSlots.length === 0,
      invalidSlots
    }
  }

  const handleAddSchedule = async () => {
    if (!newRaid) {
      toast.error('레이드를 선택해주세요.')
      return
    }

    // 입장 레벨 체크
    const { valid, invalidSlots } = checkItemLevelRequirement()
    
    if (!valid) {
      const selectedRaid = raidList.find(r => r.name === newRaid)
      toast.error(
        `슬롯 ${invalidSlots.join(', ')}의 캐릭터가 입장 레벨(${selectedRaid?.minItemLevel})에 미달합니다.`
      )
      return
    }

    try {
      const { error } = await supabase.from('schedules').insert({
        raid_name: newRaid,
        slot_1: selectedSlots[0] 
          ? formatCharacterForTable(selectedSlots[0].CharacterName, selectedSlots[0].CharacterClassName)
          : null,
        slot_2: selectedSlots[1]
          ? formatCharacterForTable(selectedSlots[1].CharacterName, selectedSlots[1].CharacterClassName)
          : null,
        slot_3: selectedSlots[2]
          ? formatCharacterForTable(selectedSlots[2].CharacterName, selectedSlots[2].CharacterClassName)
          : null,
        slot_4: selectedSlots[3]
          ? formatCharacterForTable(selectedSlots[3].CharacterName, selectedSlots[3].CharacterClassName)
          : null,
      })

      if (error) throw error

      toast.success('레이드 스케줄이 추가되었습니다.')
      setNewRaid('')
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

      toast.success(currentState ? '미완료로 변경되었습니다.' : '완료 처리되었습니다.')
    } catch (error) {
      console.error('Error updating schedule:', error)
      toast.error('상태 변경에 실패했습니다.')
    }
  }

  // 현재 선택된 레이드의 입장 레벨 정보
  const getSelectedRaidInfo = () => {
    if (!newRaid) return null
    return raidList.find(r => r.name === newRaid)
  }

  // 슬롯별 입장 가능 여부 체크
  const getSlotStatus = (slot: ExpeditionCharacter | null, minLevel: number) => {
    if (!slot) return null
    return slot.ItemLevel >= minLevel
  }

  const selectedRaidInfo = getSelectedRaidInfo()

  // 슬롯 렌더링 컴포넌트
  const SlotCell = ({ slotText }: { slotText: string | null }) => {
    const slotData = parseSlotData(slotText)
    
    if (!slotData) {
      return <span className="text-gray-500">-</span>
    }

    const role = slotData.className ? getClassRole(slotData.className) : null
    const Icon = role === 'support' ? Heart : Swords

    return (
      <div className="flex items-center gap-2">
        {role && (
          <Icon 
            size={16} 
            className={role === 'support' ? 'text-green-400' : 'text-red-400'}
          />
        )}
        <span>{slotData.name} / {slotData.className || '미상'}</span>
      </div>
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
          <h2 className="text-xl font-semibold text-white mb-4">캐릭터 검색 및 선택</h2>
          <RaidSetup 
            selectedSlots={selectedSlots}
            onSlotsChange={setSelectedSlots}
          />
        </div>

        {/* 레이드 추가 섹션 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">레이드 추가</h2>

          <div className="flex gap-3 items-end">
            {/* 레이드 선택 */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                레이드 종류
              </label>
              <select
                value={newRaid}
                onChange={(e) => setNewRaid(e.target.value)}
                className="w-full rounded bg-zinc-700 px-3 py-2 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="text-zinc-400">레이드 선택</option>
                {raidList.map((raid) => (
                  <option key={raid.name} value={raid.name} className="text-white">
                    {raid.name} (입장 {raid.minItemLevel})
                  </option>
                ))}
              </select>
            </div>

            {/* 추가 버튼 */}
            <button
              onClick={handleAddSchedule}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              레이드 추가
            </button>
          </div>

          {/* 현재 선택된 슬롯 미리보기 (입장 가능 여부 표시) */}
          <div className="mt-4 grid grid-cols-4 gap-3">
            {selectedSlots.map((slot, idx) => {
              const canEnter = selectedRaidInfo 
                ? getSlotStatus(slot, selectedRaidInfo.minItemLevel)
                : null
              
              const role = slot ? getClassRole(slot.CharacterClassName) : null
              const Icon = role === 'support' ? Heart : role === 'dealer' ? Swords : null

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
                          className={role === 'support' ? 'text-green-400' : 'text-red-400'}
                        />
                      )}
                      {canEnter === false && (
                        <AlertCircle size={14} className="text-red-400" />
                      )}
                    </div>
                  </div>
                  <div className="mt-1">
                    {slot ? (
                      <>
                        <div className="text-white font-medium">{slot.CharacterName}</div>
                        <div className="text-xs text-gray-400">{slot.CharacterClassName}</div>
                        <div className={`text-xs ${
                          canEnter === false ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {slot.ItemLevel.toLocaleString()}
                          {selectedRaidInfo && ` / ${selectedRaidInfo.minItemLevel}`}
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

          {/* 입장 불가 경고 */}
          {selectedRaidInfo && checkItemLevelRequirement().invalidSlots.length > 0 && (
            <div className="mt-4 flex items-start gap-2 bg-red-900/20 border border-red-600 rounded-lg px-4 py-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-red-400 font-medium">입장 레벨 미달</p>
                <p className="text-red-300 mt-1">
                  슬롯 {checkItemLevelRequirement().invalidSlots.join(', ')}의 캐릭터가 
                  입장 레벨({selectedRaidInfo.minItemLevel})에 미달합니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 레이드 스케줄 테이블 */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300 w-16">완료</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300">레이드 종류</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300">슬롯 1</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300">슬롯 2</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300">슬롯 3</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300">슬롯 4</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-300 w-16">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    로딩 중...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    등록된 레이드 스케줄이 없습니다.
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => (
                  <tr
                    key={schedule.id}
                    className={`hover:bg-gray-750 transition-colors ${
                      schedule.isCompleted ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleComplete(schedule.id, schedule.isCompleted)}
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
                    <td className="px-6 py-4 text-white font-medium text-center">{schedule.raidName}</td>
                    {schedule.slots.map((slot, idx) => (
                      <td key={idx} className="px-6 py-4 text-gray-300 text-center">
                        <div className="flex justify-center">
                          <SlotCell slotText={slot} />
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
          <p>💡 캐릭터를 검색하고 슬롯에 선택한 후, 레이드 종류를 선택하여 추가하세요.</p>
          <p>⚠️ 선택한 캐릭터의 아이템 레벨이 레이드 입장 레벨보다 낮으면 추가할 수 없습니다.</p>
          <p>🔄 매주 수요일 오전 6시에 완료 상태가 자동으로 초기화됩니다.</p>
        </div>
      </div>
    </div>
  )
}