import type { ExpeditionCharacter } from '@/types/loa'
import { formatCharacterForSelect } from '@/utils/classUtils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function RaidSlot({
  index,
  characters,
  value,
  onChange,
  getCharacterUsageCount,
}: {
  index: number
  characters: ExpeditionCharacter[]
  value: ExpeditionCharacter | null
  onChange: (c: ExpeditionCharacter | null) => void
  getCharacterUsageCount?: (characterName: string) => number
}) {
  // 아이템 레벨 내림차순으로 정렬
  const sortedCharacters = [...characters].sort(
    (a, b) => b.ItemLevel - a.ItemLevel,
  )

  return (
    <div className="space-y-2">
      <p className="font-semibold text-white">슬롯 {index + 1}</p>

      <Select
        value={value?.CharacterName ?? ''}
        onValueChange={(characterName) => {
          const char =
            characters.find((c) => c.CharacterName === characterName) ?? null
          onChange(char)
        }}
      >
        <SelectTrigger className="w-full bg-zinc-800 text-white border-gray-600">
          <SelectValue placeholder="캐릭터 선택" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-gray-600">
          {sortedCharacters.map((c) => {
            const usageCount = getCharacterUsageCount
              ? getCharacterUsageCount(c.CharacterName)
              : 0
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
                {formatCharacterForSelect(
                  c.CharacterName,
                  c.CharacterClassName,
                  c.ItemLevel,
                )}
                {isDisabled ? ' - 3회 등록됨' : ''}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
