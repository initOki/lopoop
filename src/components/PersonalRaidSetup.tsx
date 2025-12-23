// src/components/PersonalRaidSetup.tsx
import { useState, useEffect, useRef } from 'react'
import type { ExpeditionCharacter } from '@/types/loa'
import AccountSearch from '@/features/characterSearch/AccountSearch'
import RaidSlot from '@/features/raidSetup/RaidSlot'
import { raidList, type RaidInfo } from '@/lib/raid-list'
import { validateSlots } from '@/features/raidSetup/filterUtils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  selectedSlots?: (ExpeditionCharacter | null)[]
  onSlotsChange?: (slots: (ExpeditionCharacter | null)[]) => void
  selectedRaid?: string
  onRaidChange?: (raidName: string) => void
}

export default function PersonalRaidSetup({
  selectedSlots: externalSlots,
  onSlotsChange,
  selectedRaid: externalRaid,
  onRaidChange,
}: Props) {
  const [accounts, setAccounts] = useState<
    Record<number, ExpeditionCharacter[]>
  >({})

  const [internalSlots, setInternalSlots] = useState<
    (ExpeditionCharacter | null)[]
  >([null, null, null, null])

  const [internalRaid, setInternalRaid] = useState<string>('')

  const slots = externalSlots !== undefined ? externalSlots : internalSlots
  const setSlots = onSlotsChange || setInternalSlots
  const selectedRaid = externalRaid !== undefined ? externalRaid : internalRaid
  const setSelectedRaid = onRaidChange || setInternalRaid

  // 선택된 레이드 정보 찾기
  const selectedRaidInfo: RaidInfo | null = selectedRaid
    ? (raidList.find((raid) => raid.name === selectedRaid) ?? null)
    : null

  // 유효하지 않은 레이드 선택 처리
  useEffect(() => {
    if (selectedRaid && !selectedRaidInfo) {
      console.warn(
        `유효하지 않은 레이드 선택: "${selectedRaid}". "레이드 선택 안함"으로 처리합니다.`,
      )
      setSelectedRaid('')
    }
  }, [selectedRaid, selectedRaidInfo, setSelectedRaid])

  const handleSlotChange = (idx: number, char: ExpeditionCharacter | null) => {
    const next = [...slots]
    next[idx] = char
    setSlots(next)
  }

  // 이전 레이드 정보를 추적하기 위한 ref
  const prevRaidRef = useRef<string>(selectedRaid)

  // 계정 검색 완료 후 슬롯 재검증 로직
  const handleAccountSearchResult = (
    expeditionIndex: number,
    chars: ExpeditionCharacter[],
  ) => {
    // 계정 데이터 업데이트
    setAccounts((prev) => ({ ...prev, [expeditionIndex]: chars }))

    // 레이드가 선택되어 있을 때만 재검증 수행
    if (selectedRaid && selectedRaidInfo) {
      // 기존 슬롯 선택을 새로운 최소 아이템 레벨 요구사항에 대해 재검증
      const validatedSlots = validateSlots(slots, selectedRaidInfo.minItemLevel)

      // 검증 결과가 기존 슬롯과 다르면 업데이트
      const hasChanges = validatedSlots.some((slot, idx) => slot !== slots[idx])
      if (hasChanges) {
        setSlots(validatedSlots)
      }
    }
  }

  // 레이드 변경 시 슬롯 검증 로직
  useEffect(() => {
    const prevRaid = prevRaidRef.current
    const currentRaid = selectedRaid

    // 레이드가 실제로 변경되었을 때만 검증 수행
    if (prevRaid !== currentRaid) {
      prevRaidRef.current = currentRaid

      // "레이드 선택 안함"으로 변경하는 경우 모든 선택 유지
      if (currentRaid === '') {
        return
      }

      // 새로운 레이드의 최소 아이템 레벨 찾기
      const newRaidInfo = raidList.find((raid) => raid.name === currentRaid)
      if (newRaidInfo) {
        // 기존 슬롯 선택을 새로운 최소 아이템 레벨에 대해 검증
        const validatedSlots = validateSlots(slots, newRaidInfo.minItemLevel)

        // 검증 결과가 기존 슬롯과 다르면 업데이트
        const hasChanges = validatedSlots.some(
          (slot, idx) => slot !== slots[idx],
        )
        if (hasChanges) {
          setSlots(validatedSlots)
        }
      }
    }
  }, [selectedRaid, slots, setSlots])

  const handleRaidChange = (raidName: string) => {
    setSelectedRaid(raidName)
  }

  return (
    <div className="space-y-6">
      {/* 레이드 선택 UI */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          레이드 선택
        </label>
        <Select value={selectedRaid} onValueChange={handleRaidChange}>
          <SelectTrigger className="w-full max-w-md bg-zinc-800 text-white border-gray-600 focus:border-blue-500">
            <SelectValue placeholder="레이드 선택" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-gray-600">
            <SelectItem value="none" className="text-white">
              레이드 선택 안함 (모든 캐릭터 표시)
            </SelectItem>
            {raidList.map((raid) => (
              <SelectItem
                key={raid.name}
                value={raid.name}
                className="text-white"
              >
                {raid.name} (입장 {raid.minItemLevel})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedRaidInfo && (
          <p className="mt-2 text-sm text-gray-400">
            선택된 레이드 :{' '}
            <span className="text-white font-medium">
              {selectedRaidInfo.name}
            </span>{' '}
            | 최소 아이템 레벨:{' '}
            <span className="text-blue-400 font-medium">
              {selectedRaidInfo.minItemLevel}
            </span>
          </p>
        )}
      </div>

      {/* 단일 계정 검색 */}
      <div>
        <AccountSearch
          expeditionIndex={1}
          onResult={(chars) => handleAccountSearchResult(1, chars)}
        />
      </div>

      {/* 단일 레이드 슬롯 */}
      <div>
        <RaidSlot
          index={0}
          characters={accounts[1] ?? []}
          value={slots[0]}
          onChange={(char) => handleSlotChange(0, char)}
          minItemLevel={selectedRaidInfo?.minItemLevel}
        />
      </div>
    </div>
  )
}