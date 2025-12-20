import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { ExpeditionCharacter } from '@/types/loa'
import type { RaidSchedule } from '@/types/schedule'
import { parseSlotData } from '@/utils/scheduleUtils'
import { raidList } from '@/lib/raid-list'

export function useSlotEditor(schedules: RaidSchedule[]) {
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(
    null,
  )
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null)
  const [editCharacters, setEditCharacters] = useState<ExpeditionCharacter[]>(
    [],
  )
  const [selectedEditCharacter, setSelectedEditCharacter] =
    useState<ExpeditionCharacter | null>(null)

  // 캐릭터가 현재 스케줄에 몇 번 등록되어 있는지 확인
  const getCharacterUsageCount = (
    characterName: string,
    excludeScheduleId?: number,
    excludeSlotIndex?: number,
  ) => {
    let count = 0
    schedules.forEach((schedule) => {
      schedule.slots.forEach((slot, idx) => {
        // 현재 편집 중인 슬롯은 제외
        if (excludeScheduleId === schedule.id && excludeSlotIndex === idx) {
          return
        }

        const slotData = parseSlotData(slot)
        if (slotData && slotData.name === characterName) {
          count++
        }
      })
    })
    return count
  }

  // 슬롯 편집 시작
  const startEditSlot = (scheduleId: number, slotIndex: number) => {
    setEditingScheduleId(scheduleId)
    setEditingSlotIndex(slotIndex)
    setEditCharacters([])
    setSelectedEditCharacter(null)
  }

  // 슬롯 편집 취소
  const cancelEdit = () => {
    setEditingScheduleId(null)
    setEditingSlotIndex(null)
    setEditCharacters([])
    setSelectedEditCharacter(null)
  }

  // 슬롯 업데이트
  const updateSlot = async (scheduleId: number, slotIndex: number) => {
    if (!selectedEditCharacter) {
      toast.error('캐릭터를 선택해주세요.')
      return
    }

    // 캐릭터 사용 횟수 체크 (현재 편집 중인 슬롯 제외)
    const usageCount = getCharacterUsageCount(
      selectedEditCharacter.CharacterName,
      scheduleId,
      slotIndex,
    )
    if (usageCount >= 3) {
      toast.error(
        `${selectedEditCharacter.CharacterName}은(는) 이미 3회 등록되어 있어 더 이상 추가할 수 없습니다.`,
      )
      return
    }

    const schedule = schedules.find((s) => s.id === scheduleId)
    if (!schedule) return

    // 레이드 입장 레벨 체크
    const selectedRaid = raidList.find((r) => r.name === schedule.raidName)
    if (
      selectedRaid &&
      selectedEditCharacter.ItemLevel < selectedRaid.minItemLevel
    ) {
      toast.error(
        `선택한 캐릭터의 아이템 레벨(${selectedEditCharacter.ItemLevel})이 레이드 입장 레벨(${selectedRaid.minItemLevel})에 미달합니다.`,
      )
      return
    }

    try {
      const slotKey = `slot_${slotIndex + 1}` as
        | 'slot_1'
        | 'slot_2'
        | 'slot_3'
        | 'slot_4'
      const combatPowerKey = `slot_${slotIndex + 1}_combat_power` as
        | 'slot_1_combat_power'
        | 'slot_2_combat_power'
        | 'slot_3_combat_power'
        | 'slot_4_combat_power'

      const { error } = await supabase
        .from('schedules')
        .update({
          [slotKey]: `${selectedEditCharacter.CharacterName} / ${selectedEditCharacter.CharacterClassName}`,
          [combatPowerKey]: selectedEditCharacter.CombatPower
            ? parseInt(selectedEditCharacter.CombatPower.replace(/,/g, '')) ||
              null
            : null,
        })
        .eq('id', scheduleId)

      if (error) throw error

      toast.success('캐릭터가 변경되었습니다.')
      cancelEdit()
    } catch (error) {
      console.error('Error updating slot:', error)
      toast.error('캐릭터 변경에 실패했습니다.')
    }
  }

  // 슬롯 비우기
  const clearSlot = async (scheduleId: number, slotIndex: number) => {
    if (!confirm('이 슬롯을 비우시겠습니까?')) return

    try {
      const slotKey = `slot_${slotIndex + 1}` as
        | 'slot_1'
        | 'slot_2'
        | 'slot_3'
        | 'slot_4'
      const combatPowerKey = `slot_${slotIndex + 1}_combat_power` as
        | 'slot_1_combat_power'
        | 'slot_2_combat_power'
        | 'slot_3_combat_power'
        | 'slot_4_combat_power'

      const { error } = await supabase
        .from('schedules')
        .update({
          [slotKey]: null,
          [combatPowerKey]: null,
        })
        .eq('id', scheduleId)

      if (error) throw error

      toast.success('슬롯이 비워졌습니다.')
    } catch (error) {
      console.error('Error clearing slot:', error)
      toast.error('슬롯 비우기에 실패했습니다.')
    }
  }

  return {
    editingScheduleId,
    editingSlotIndex,
    editCharacters,
    selectedEditCharacter,
    getCharacterUsageCount,
    startEditSlot,
    cancelEdit,
    updateSlot,
    clearSlot,
    setEditCharacters,
    setSelectedEditCharacter,
  }
}
