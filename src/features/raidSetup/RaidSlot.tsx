import type { ExpeditionCharacter } from '@/types/loa'
import { formatCharacterForSelect } from '@/utils/classUtils'
import { filterAndSortCharacters } from './filterUtils'
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
  minItemLevel,
}: {
  index: number
  characters: ExpeditionCharacter[]
  value: ExpeditionCharacter | null
  onChange: (c: ExpeditionCharacter | null) => void
  getCharacterUsageCount?: (characterName: string) => number
  minItemLevel?: number
}) {
  // 유틸리티 함수를 사용하여 캐릭터 필터링 및 정렬
  const filteredAndSortedCharacters = filterAndSortCharacters(
    characters || [], // characters가 undefined일 경우 빈 배열로 처리
    minItemLevel,
  )

  return (
    <div className="space-y-2">
      <p className="font-semibold text-white">
        슬롯 {index + 1}
        {minItemLevel && (
          <span className="text-sm text-gray-400 ml-2">
            (입장 {minItemLevel}+)
          </span>
        )}
      </p>

      <Select
        value={value?.CharacterName ?? ''}
        onValueChange={(characterName) => {
          const char =
            characters.find((c) => c.CharacterName === characterName) ?? null
          onChange(char)
        }}
      >
        <SelectTrigger className="w-full bg-zinc-800 text-white border-gray-600">
          <SelectValue
            placeholder={
              filteredAndSortedCharacters.length === 0 && minItemLevel
                ? '입장 가능한 캐릭터가 없습니다'
                : '캐릭터 선택'
            }
          />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-gray-600">
          {filteredAndSortedCharacters.length === 0 ? (
            <SelectItem
              value="__no_characters__"
              disabled
              className="text-gray-500"
            >
              {minItemLevel
                ? `최소 아이템 레벨 ${minItemLevel}을 충족하는 캐릭터가 없습니다`
                : '사용 가능한 캐릭터가 없습니다'}
            </SelectItem>
          ) : (
            filteredAndSortedCharacters.map((c) => {
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
                    c.ItemLevel ?? 0, // 아이템 레벨 데이터 누락 시 0으로 처리
                    c.Stats, // 전투력
                  )}
                  {isDisabled ? ' - 3회 등록됨' : ''}
                </SelectItem>
              )
            })
          )}
        </SelectContent>
      </Select>

      {filteredAndSortedCharacters.length > 0 && (
        <p className="text-xs text-gray-500">
          {filteredAndSortedCharacters.length}개 캐릭터 사용 가능
        </p>
      )}
    </div>
  )
}
