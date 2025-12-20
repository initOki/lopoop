import { Heart, Swords, Edit2, X, Save } from 'lucide-react'
import { getClassRole } from '@/utils/classUtils'
import { parseSlotData } from '@/utils/scheduleUtils'
import AccountSearch from '@/features/characterSearch/AccountSearch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ExpeditionCharacter } from '@/types/loa'

type Props = {
  scheduleId: number
  slotIndex: number
  slotText: string | null
  combatPower?: number | null
  isEditing: boolean
  editCharacters: ExpeditionCharacter[]
  selectedEditCharacter: ExpeditionCharacter | null
  onStartEdit: (scheduleId: number, slotIndex: number) => void
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

export default function SlotCell({
  scheduleId,
  slotIndex,
  slotText,
  combatPower,
  isEditing,
  editCharacters,
  selectedEditCharacter,
  onStartEdit,
  onCancelEdit,
  onUpdateSlot,
  onClearSlot,
  onCharacterSearch,
  onCharacterSelect,
  getCharacterUsageCount,
}: Props) {
  const slotData = parseSlotData(slotText)

  if (isEditing) {
    return (
      <div className="space-y-2 w-full">
        <AccountSearch
          expeditionIndex={1}
          onResult={onCharacterSearch}
          compact={true}
        />
        {editCharacters.length > 0 && (
          <Select
            value={selectedEditCharacter?.CharacterName ?? ''}
            onValueChange={(characterName) => {
              const char =
                editCharacters.find((c) => c.CharacterName === characterName) ??
                null
              onCharacterSelect(char)
            }}
          >
            <SelectTrigger className="w-full bg-zinc-700 text-white border-gray-600 text-xs h-7">
              <SelectValue placeholder="캐릭터 선택" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-gray-600 max-h-48 overflow-y-auto">
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
                      <div className="text-xs w-full">
                        <div
                          className="font-medium truncate"
                          title={c.CharacterName}
                        >
                          {c.CharacterName}
                        </div>
                        <div className="text-gray-400 truncate">
                          {c.CharacterClassName} ({c.ItemLevel.toLocaleString()}
                          {c.CombatPower
                            ? ` / ${c.CombatPower.toLocaleString()}`
                            : ''}
                          ){isDisabled ? ' - 3회 등록됨' : ''}
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
            </SelectContent>
          </Select>
        )}
        <div className="flex gap-1">
          <button
            onClick={() => onUpdateSlot(scheduleId, slotIndex)}
            className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
            title="저장"
          >
            <Save size={12} />
            저장
          </button>
          <button
            onClick={onCancelEdit}
            className="flex-1 flex items-center justify-center gap-1 bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs transition-colors"
            title="취소"
          >
            <X size={12} />
            취소
          </button>
        </div>
      </div>
    )
  }

  if (!slotData) {
    return (
      <div className="flex items-center justify-between w-full">
        <span className="text-gray-500 text-sm">-</span>
        <button
          onClick={() => onStartEdit(scheduleId, slotIndex)}
          className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex-shrink-0"
          title="캐릭터 추가"
        >
          <Edit2 size={12} />
        </button>
      </div>
    )
  }

  const role = slotData.className ? getClassRole(slotData.className) : null
  const Icon = role === 'support' ? Heart : Swords

  // 전투력은 새로운 컬럼 우선, 없으면 기존 파싱된 데이터 사용
  const displayCombatPower = combatPower ?? slotData.stats

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-1 mb-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            {role && (
              <Icon
                size={12}
                className={`flex-shrink-0 ${role === 'support' ? 'text-green-400' : 'text-red-400'}`}
              />
            )}
            <div className="min-w-0 flex-1">
              <div
                className="text-xs font-medium truncate"
                title={slotData.name}
              >
                {slotData.name}
              </div>
              <div
                className="text-xs text-gray-400 truncate"
                title={slotData.className || '미상'}
              >
                {slotData.className || '미상'}
              </div>
            </div>
          </div>
          {displayCombatPower && (
            <div className="text-xs text-blue-400 truncate">
              {displayCombatPower.toLocaleString()}
            </div>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onStartEdit(scheduleId, slotIndex)}
            className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            title="캐릭터 변경"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={() => onClearSlot(scheduleId, slotIndex)}
            className="p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            title="슬롯 비우기"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
