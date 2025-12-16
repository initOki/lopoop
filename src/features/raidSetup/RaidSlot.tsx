import type { ExpeditionCharacter } from '@/types/loa'
import { formatCharacterForSelect } from '@/utils/classUtils'

export default function RaidSlot({
  index,
  characters,
  value,
  onChange,
}: {
  index: number
  characters: ExpeditionCharacter[]
  value: ExpeditionCharacter | null
  onChange: (c: ExpeditionCharacter | null) => void
}) {
  // 아이템 레벨 내림차순으로 정렬
  const sortedCharacters = [...characters].sort((a, b) => b.ItemLevel - a.ItemLevel)

  return (
    <div className="space-y-2">
      <p className="font-semibold text-white">슬롯 {index + 1}</p>

      <select
        className="
          w-full
          rounded
          bg-zinc-800
          px-2 py-2
          text-white
          focus:outline-none
          focus:ring-2 focus:ring-blue-500
        "
        value={value?.CharacterName ?? ''}
        onChange={(e) => {
          const char =
            characters.find((c) => c.CharacterName === e.target.value) ??
            null
          onChange(char)
        }}
      >
        <option value="" className="text-zinc-400 bg-zinc-800">
          캐릭터 선택
        </option>

        {sortedCharacters.map((c) => (
          <option 
            key={c.CharacterName} 
            value={c.CharacterName}
            className="text-white bg-zinc-800"
          >
            {formatCharacterForSelect(c.CharacterName, c.CharacterClassName, c.ItemLevel)}
          </option>
        ))}
      </select>
    </div>
  )
}