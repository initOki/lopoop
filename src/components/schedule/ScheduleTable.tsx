import { Check, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import SlotCell from './SlotCell'
import type { RaidSchedule, SortField, ScheduleSort } from '@/types/schedule'
import type { ExpeditionCharacter } from '@/types/loa'

type Props = {
  schedules: RaidSchedule[]
  isLoading: boolean
  sort: ScheduleSort
  editingScheduleId: number | null
  editingSlotIndex: number | null
  editCharacters: ExpeditionCharacter[]
  selectedEditCharacter: ExpeditionCharacter | null
  onSort: (field: SortField) => void
  onToggleComplete: (id: number, currentState: boolean) => void
  onDeleteSchedule: (id: number) => void
  onStartEditSlot: (scheduleId: number, slotIndex: number) => void
  onCancelEdit: () => void
  onUpdateSlot: (scheduleId: number, slotIndex: number) => void
  onClearSlot: (scheduleId: number, slotIndex: number) => void
  onCharacterSearch: (chars: ExpeditionCharacter[]) => void
  onCharacterSelect: (char: ExpeditionCharacter | null) => void
  getCharacterUsageCount: (
    name: string,
    excludeScheduleId?: number,
    excludeSlotIndex?: number,
  ) => number
}

export default function ScheduleTable({
  schedules,
  isLoading,
  sort,
  editingScheduleId,
  editingSlotIndex,
  editCharacters,
  selectedEditCharacter,
  onSort,
  onToggleComplete,
  onDeleteSchedule,
  onStartEditSlot,
  onCancelEdit,
  onUpdateSlot,
  onClearSlot,
  onCharacterSearch,
  onCharacterSelect,
  getCharacterUsageCount,
}: Props) {
  // 정렬 아이콘 렌더링
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) {
      return <ArrowUpDown size={16} className="text-gray-500" />
    }
    if (sort.direction === 'asc') {
      return <ArrowUp size={16} className="text-blue-400" />
    }
    return <ArrowDown size={16} className="text-blue-400" />
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed min-w-[1200px]">
          <colgroup>
            <col className="w-20" />
            <col className="w-32" />
            <col className="w-48" />
            <col className="w-48" />
            <col className="w-48" />
            <col className="w-48" />
            <col className="w-28" />
            <col className="w-20" />
          </colgroup>
          <thead className="bg-gray-700">
            <tr>
              <th className="px-3 py-3 text-sm font-semibold text-gray-300">
                <button
                  onClick={() => onSort('isCompleted')}
                  className="flex items-center gap-1 hover:text-white transition-colors text-xs w-full justify-center"
                >
                  완료
                  <SortIcon field="isCompleted" />
                </button>
              </th>
              <th className="px-3 py-3 text-sm font-semibold text-gray-300">
                <button
                  onClick={() => onSort('raidName')}
                  className="flex items-center gap-1 hover:text-white transition-colors text-xs w-full justify-center"
                >
                  레이드
                  <SortIcon field="raidName" />
                </button>
              </th>
              <th className="px-2 py-3 text-sm font-semibold text-gray-300 text-center">
                슬롯 1
              </th>
              <th className="px-2 py-3 text-sm font-semibold text-gray-300 text-center">
                슬롯 2
              </th>
              <th className="px-2 py-3 text-sm font-semibold text-gray-300 text-center">
                슬롯 3
              </th>
              <th className="px-2 py-3 text-sm font-semibold text-gray-300 text-center">
                슬롯 4
              </th>
              <th className="px-3 py-3 text-sm font-semibold text-gray-300 text-center">
                평균
                <br />
                전투력
              </th>
              <th className="px-3 py-3 text-sm font-semibold text-gray-300 text-center">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  로딩 중...
                </td>
              </tr>
            ) : schedules.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  검색 결과가 없습니다.
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
                  <td className="px-3 py-4 text-center">
                    <button
                      onClick={() =>
                        onToggleComplete(schedule.id, schedule.isCompleted)
                      }
                      className={`p-2 rounded-lg transition-colors ${
                        schedule.isCompleted
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                      }`}
                      title={schedule.isCompleted ? '완료 취소' : '완료 처리'}
                    >
                      <Check size={16} />
                    </button>
                  </td>
                  <td className="px-3 py-4 text-white font-medium text-center">
                    <div className="text-sm" title={schedule.raidName}>
                      {schedule.raidName}
                    </div>
                  </td>
                  {schedule.slots.map((slot, idx) => (
                    <td key={idx} className="px-2 py-4 text-gray-300">
                      <SlotCell
                        scheduleId={schedule.id}
                        slotIndex={idx}
                        slotText={slot}
                        combatPower={schedule.combatPowers[idx]}
                        isEditing={
                          editingScheduleId === schedule.id &&
                          editingSlotIndex === idx
                        }
                        editCharacters={editCharacters}
                        selectedEditCharacter={selectedEditCharacter}
                        onStartEdit={onStartEditSlot}
                        onCancelEdit={onCancelEdit}
                        onUpdateSlot={onUpdateSlot}
                        onClearSlot={onClearSlot}
                        onCharacterSearch={onCharacterSearch}
                        onCharacterSelect={onCharacterSelect}
                        getCharacterUsageCount={getCharacterUsageCount}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-4 text-center">
                    {schedule.averageStats ? (
                      <span className="text-blue-400 font-semibold text-sm">
                        {schedule.averageStats.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-3 py-4 text-center">
                    <button
                      onClick={() => onDeleteSchedule(schedule.id)}
                      className="inline-flex items-center justify-center p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
