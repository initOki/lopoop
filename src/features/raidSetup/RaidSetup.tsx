import { useState } from 'react'
import type { ExpeditionCharacter } from '@/types/loa'
import AccountSearch from '@/features/characterSearch/AccountSearch'
import RaidSlot from './RaidSlot'

export default function RaidSetup() {
  const [accounts, setAccounts] = useState<Record<number, ExpeditionCharacter[]>>(
    {},
  )

  const [slots, setSlots] = useState<(ExpeditionCharacter | null)[]>([
    null,
    null,
    null,
    null,
  ])

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
              onChange={(char) =>
                setSlots((prev) => {
                  const next = [...prev]
                  next[idx] = char
                  return next
                })
              }
            />
          )
        })}
      </div>
    </div>
  )
}

