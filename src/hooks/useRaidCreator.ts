import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { raidList } from '@/lib/raid-list'
import type { ExpeditionCharacter } from '@/types/loa'
import {
  serializeRaidSetupState,
  deserializeRaidSetupState,
} from '@/features/raidSetup/filterUtils'
import { calculateAverageStats } from '@/utils/scheduleUtils'

const RAID_SETUP_STATE_KEY = 'raid_setup_state'

export function useRaidCreator(
  getCharacterUsageCount: (name: string) => number,
) {
  const [selectedRaid, setSelectedRaid] = useState('')
  const [selectedSlots, setSelectedSlots] = useState<
    (ExpeditionCharacter | null)[]
  >([null, null, null, null])

  // 초기 상태 복원
  useEffect(() => {
    const savedState = localStorage.getItem(RAID_SETUP_STATE_KEY)
    if (savedState) {
      const restoredState = deserializeRaidSetupState(savedState)
      if (restoredState) {
        setSelectedRaid(restoredState.selectedRaid)
        setSelectedSlots(restoredState.selectedSlots)
      }
    }
  }, [])

  // 상태 변경 시 저장
  useEffect(() => {
    if (selectedRaid || selectedSlots.some((slot) => slot !== null)) {
      const serialized = serializeRaidSetupState(selectedRaid, selectedSlots)
      if (serialized) {
        localStorage.setItem(RAID_SETUP_STATE_KEY, serialized)
      }
    }
  }, [selectedRaid, selectedSlots])

  // 레이드 입장 레벨 체크
  const checkItemLevelRequirement = (): {
    valid: boolean
    invalidSlots: number[]
  } => {
    if (!selectedRaid) return { valid: true, invalidSlots: [] }

    const selectedRaidInfo = raidList.find((r) => r.name === selectedRaid)
    if (!selectedRaidInfo) return { valid: true, invalidSlots: [] }

    const invalidSlots: number[] = []

    selectedSlots.forEach((slot, idx) => {
      if (slot && slot.ItemLevel < selectedRaidInfo.minItemLevel) {
        invalidSlots.push(idx + 1)
      }
    })

    return {
      valid: invalidSlots.length === 0,
      invalidSlots,
    }
  }

  const addSchedule = async () => {
    if (!selectedRaid) {
      toast.error('레이드를 선택해주세요.')
      return
    }

    // 입장 레벨 체크
    const { valid, invalidSlots } = checkItemLevelRequirement()

    if (!valid) {
      const selectedRaidInfo = raidList.find((r) => r.name === selectedRaid)
      toast.error(
        `슬롯 ${invalidSlots.join(', ')}의 캐릭터가 입장 레벨(${selectedRaidInfo?.minItemLevel})에 미달합니다.`,
      )
      return
    }

    // 캐릭터 3회 등록 체크
    const overusedCharacters: string[] = []
    selectedSlots.forEach((slot) => {
      if (slot) {
        const usageCount = getCharacterUsageCount(slot.CharacterName)
        if (usageCount >= 3) {
          overusedCharacters.push(slot.CharacterName)
        }
      }
    })

    if (overusedCharacters.length > 0) {
      toast.error(
        `${overusedCharacters.join(', ')}은(는) 이미 3회 등록되어 있어 더 이상 추가할 수 없습니다.`,
      )
      return
    }

    try {
      const insertData = {
        raid_name: selectedRaid,
        slot_1: selectedSlots[0]
          ? `${selectedSlots[0].CharacterName} / ${selectedSlots[0].CharacterClassName}`
          : null,
        slot_1_combat_power: selectedSlots[0]?.CombatPower
          ? parseInt(selectedSlots[0].CombatPower.replace(/,/g, '')) || null
          : null,
        slot_2: selectedSlots[1]
          ? `${selectedSlots[1].CharacterName} / ${selectedSlots[1].CharacterClassName}`
          : null,
        slot_2_combat_power: selectedSlots[1]?.CombatPower
          ? parseInt(selectedSlots[1].CombatPower.replace(/,/g, '')) || null
          : null,
        slot_3: selectedSlots[2]
          ? `${selectedSlots[2].CharacterName} / ${selectedSlots[2].CharacterClassName}`
          : null,
        slot_3_combat_power: selectedSlots[2]?.CombatPower
          ? parseInt(selectedSlots[2].CombatPower.replace(/,/g, '')) || null
          : null,
        slot_4: selectedSlots[3]
          ? `${selectedSlots[3].CharacterName} / ${selectedSlots[3].CharacterClassName}`
          : null,
        slot_4_combat_power: selectedSlots[3]?.CombatPower
          ? parseInt(selectedSlots[3].CombatPower.replace(/,/g, '')) || null
          : null,
      }

      const { error } = await supabase.from('schedules').insert(insertData)

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      toast.success('레이드 스케줄이 추가되었습니다.')
      setSelectedRaid('')
      setSelectedSlots([null, null, null, null])
    } catch (error) {
      console.error('Error adding schedule:', error)
      toast.error('레이드 스케줄 추가에 실패했습니다.')
    }
  }

  // 현재 선택된 레이드의 입장 레벨 정보
  const getSelectedRaidInfo = () => {
    if (!selectedRaid) return null
    return raidList.find((r) => r.name === selectedRaid)
  }

  // 슬롯별 입장 가능 여부 체크
  const getSlotStatus = (
    slot: ExpeditionCharacter | null,
    minLevel: number,
  ) => {
    if (!slot) return null
    return slot.ItemLevel >= minLevel
  }

  const averageStats = calculateAverageStats(selectedSlots)

  return {
    selectedRaid,
    selectedSlots,
    setSelectedRaid,
    setSelectedSlots,
    addSchedule,
    checkItemLevelRequirement,
    getSelectedRaidInfo,
    getSlotStatus,
    averageStats,
  }
}
