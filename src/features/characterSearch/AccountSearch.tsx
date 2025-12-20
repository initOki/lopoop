import { useState } from 'react'
import type { ExpeditionCharacter } from '@/types/loa'
import {
  fetchCharacterSiblings,
  fetchCharacterProfile,
} from '@/features/characterSearch/loaApi'

type Props = {
  expeditionIndex: number
  onResult: (chars: ExpeditionCharacter[]) => void
  compact?: boolean
}

export default function AccountSearch({
  expeditionIndex,
  onResult,
  compact = false,
}: Props) {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)

  const search = async () => {
    if (!keyword.trim()) return

    try {
      setLoading(true)
      const result = await fetchCharacterSiblings(keyword.trim())

      // 각 캐릭터의 전투력 정보를 병렬로 가져오기
      const charactersWithStats = await Promise.all(
        result.map(async (c) => {
          const profile = await fetchCharacterProfile(c.CharacterName)

          return {
            CharacterName: c.CharacterName,
            ItemLevel: Number(c.ItemAvgLevel.replace(/,/g, '')),
            ServerName: c.ServerName,
            CharacterClassName: c.CharacterClassName,
            ExpeditionIndex: expeditionIndex,
            CombatPower: profile?.CombatPower ? profile.CombatPower : undefined,
          }
        }),
      )

      onResult(charactersWithStats)
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <div className="flex gap-1">
        <input
          className="
            flex-1
            rounded
            bg-zinc-800
            px-2 py-1
            text-white
            placeholder:text-zinc-400
            focus:outline-none
            focus:ring-1 focus:ring-blue-500
            text-xs
            h-7
          "
          placeholder="닉네임 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') search()
          }}
        />
        <button
          type="button"
          disabled={loading}
          onClick={search}
          className="
            rounded
            bg-blue-600
            px-2 py-1
            text-white
            hover:bg-blue-500
            disabled:cursor-not-allowed
            disabled:opacity-50
            text-xs
            h-7
            flex-shrink-0
          "
        >
          {loading ? '검색중' : '검색'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="font-semibold text-white">계정 {expeditionIndex}</p>

      <div className="flex gap-2">
        <input
          className="
            flex-1
            rounded
            bg-zinc-800
            px-2 py-1
            text-white
            placeholder:text-zinc-400
            focus:outline-none
            focus:ring-2 focus:ring-blue-500
          "
          placeholder="닉네임 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') search()
          }}
        />

        <button
          type="button"
          disabled={loading}
          onClick={search}
          className="
            rounded
            bg-blue-600
            px-3 py-1
            text-white
            hover:bg-blue-500
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {loading ? '검색 중...' : '검색'}
        </button>
      </div>
    </div>
  )
}
