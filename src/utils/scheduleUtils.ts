import type { SlotData, ScheduleRow, RaidSchedule } from '@/types/schedule'

// 슬롯 데이터 파싱
export function parseSlotData(slotText: string | null): SlotData {
  if (!slotText) return null

  // "캐릭터이름 / 직업 / 전투력" 형식으로 저장된 경우
  const parts = slotText.split(' / ')
  if (parts.length === 3) {
    return {
      name: parts[0].trim(),
      className: parts[1].trim(),
      stats: parseInt(parts[2].trim()),
    }
  }

  // "캐릭터이름 / 직업" 형식으로 저장된 경우 (하위 호환성)
  if (parts.length === 2) {
    return {
      name: parts[0].trim(),
      className: parts[1].trim(),
    }
  }

  // 이름만 저장된 경우 (하위 호환성)
  return {
    name: slotText,
    className: '',
  }
}

// 데이터베이스 행을 스케줄 객체로 변환
export function rowToSchedule(row: ScheduleRow): RaidSchedule {
  const slots = [row.slot_1, row.slot_2, row.slot_3, row.slot_4]
  const combatPowers = [
    row.slot_1_combat_power,
    row.slot_2_combat_power,
    row.slot_3_combat_power,
    row.slot_4_combat_power,
  ]

  // 평균 전투력 계산 - 새로운 컬럼 우선 사용
  const statsValues = combatPowers.filter(
    (power): power is number => power !== null && power !== undefined,
  )

  // 새로운 컬럼에 데이터가 없으면 기존 방식으로 파싱 (하위 호환성)
  if (statsValues.length === 0) {
    const legacyStatsValues = slots
      .map((slot) => parseSlotData(slot)?.stats)
      .filter((stats): stats is number => stats !== undefined)

    const averageStats =
      legacyStatsValues.length > 0
        ? Math.round(
            legacyStatsValues.reduce((sum, stats) => sum + stats, 0) /
              legacyStatsValues.length,
          )
        : undefined

    return {
      id: row.id,
      raidName: row.raid_name || '',
      slots,
      combatPowers,
      isCompleted: row.is_completed || false,
      createdAt: new Date(row.created_at),
      averageStats,
    }
  }

  const averageStats =
    statsValues.length > 0
      ? Math.round(
          statsValues.reduce((sum, stats) => sum + stats, 0) /
            statsValues.length,
        )
      : undefined

  return {
    id: row.id,
    raidName: row.raid_name || '',
    slots,
    combatPowers,
    isCompleted: row.is_completed || false,
    createdAt: new Date(row.created_at),
    averageStats,
  }
}

// 다음 수요일 오전 6시 계산
export function getNextWednesday6AM(fromDate: Date): Date {
  const date = new Date(fromDate)
  const dayOfWeek = date.getDay()
  const daysUntilWednesday = (3 - dayOfWeek + 7) % 7 || 7

  date.setDate(date.getDate() + daysUntilWednesday)
  date.setHours(6, 0, 0, 0)

  return date
}

// 파티 평균 전투력 계산
export function calculateAverageStats(
  selectedSlots: (any | null)[],
): number | null {
  const slotsWithStats = selectedSlots.filter(
    (slot) =>
      slot !== null &&
      slot.CombatPower !== undefined &&
      slot.CombatPower !== '',
  )
  if (slotsWithStats.length === 0) return null

  const totalStats = slotsWithStats.reduce((sum, slot) => {
    const combatPower = parseInt(slot!.CombatPower!.replace(/,/g, '')) || 0
    return sum + combatPower
  }, 0)

  return Math.round(totalStats / slotsWithStats.length)
}
