// src/features/raidSetup/RaidSetup.tsx
import { useState } from 'react'
import type { ExpeditionCharacter } from '@/types/loa'
import AccountSearch from '@/features/characterSearch/AccountSearch'
import RaidSlot from '@/features/raidSetup/RaidSlot'

type Props = {
  selectedSlots?: (ExpeditionCharacter | null)[]
  onSlotsChange?: (slots: (ExpeditionCharacter | null)[]) => void
  getCharacterUsageCount?: (characterName: string) => number
}

export default function RaidSetup({
  selectedSlots: externalSlots,
  onSlotsChange,
  getCharacterUsageCount,
}: Props) {
  const [accounts, setAccounts] = useState<
    Record<number, ExpeditionCharacter[]>
  >({})

  const [internalSlots, setInternalSlots] = useState<
    (ExpeditionCharacter | null)[]
  >([null, null, null, null])

  const slots = externalSlots !== undefined ? externalSlots : internalSlots
  const setSlots = onSlotsChange || setInternalSlots

  const handleSlotChange = (idx: number, char: ExpeditionCharacter | null) => {
    const next = [...slots]
    next[idx] = char
    setSlots(next)
  }

  return (
    <div className="space-y-8">
      {/* 상단: 계정 검색 */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <AccountSearch
            key={i}
            expeditionIndex={i}
            onResult={(chars) =>
              setAccounts((prev) => ({ ...prev, [i]: chars }))
            }
          />
        ))}
      </div>

      {/* 하단: 레이드 슬롯 */}
      <div className="grid grid-cols-4 gap-4">
        {slots.map((slot, idx) => {
          const expeditionIndex = idx + 1

          return (
            <RaidSlot
              key={idx}
              index={idx}
              characters={accounts[expeditionIndex] ?? []}
              value={slot}
              onChange={(char) => handleSlotChange(idx, char)}
              getCharacterUsageCount={getCharacterUsageCount}
            />
          )
        })}
      </div>
    </div>
  )
}
