import { supabase } from './supabase'

/**
 * 다음 수요일 오전 6시(한국 시간)를 계산합니다.
 * @param date 기준 날짜 (기본값: 현재 시간)
 * @returns 다음 수요일 오전 6시의 Date 객체
 */
export function getNextWednesday6AM(date: Date = new Date()): Date {
  // 한국 시간으로 변환 (UTC+9)
  const koreaTime = new Date(
    date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
  )

  // 다음 수요일 찾기 (수요일 = 3)
  const currentDay = koreaTime.getDay()
  const daysUntilWednesday = currentDay <= 3 ? 3 - currentDay : 10 - currentDay

  const nextWednesday = new Date(koreaTime)
  nextWednesday.setDate(koreaTime.getDate() + daysUntilWednesday)
  nextWednesday.setHours(6, 0, 0, 0)

  // 만약 오늘이 수요일이고 아직 6시 이전이라면 오늘을 반환
  if (currentDay === 3 && koreaTime.getHours() < 6) {
    const today = new Date(koreaTime)
    today.setHours(6, 0, 0, 0)
    return today
  }

  return nextWednesday
}

/**
 * 마지막 수요일 오전 6시(한국 시간)를 계산합니다.
 * @param date 기준 날짜 (기본값: 현재 시간)
 * @returns 마지막 수요일 오전 6시의 Date 객체
 */
export function getLastWednesday6AM(date: Date = new Date()): Date {
  // 한국 시간으로 변환 (UTC+9)
  const koreaTime = new Date(
    date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
  )

  // 마지막 수요일 찾기 (수요일 = 3)
  const currentDay = koreaTime.getDay()
  const daysSinceWednesday = currentDay >= 3 ? currentDay - 3 : currentDay + 4

  const lastWednesday = new Date(koreaTime)
  lastWednesday.setDate(koreaTime.getDate() - daysSinceWednesday)
  lastWednesday.setHours(6, 0, 0, 0)

  // 만약 오늘이 수요일이고 아직 6시 이전이라면 지난주 수요일을 반환
  if (currentDay === 3 && koreaTime.getHours() < 6) {
    lastWednesday.setDate(lastWednesday.getDate() - 7)
  }

  return lastWednesday
}

/**
 * 주간 초기화가 필요한지 확인합니다.
 * @param userId 사용자 ID
 * @param menuId 메뉴 ID
 * @returns 초기화가 필요하면 true, 아니면 false
 */
export async function shouldResetWeekly(
  userId: string,
  menuId: string,
): Promise<boolean> {
  try {
    // 마지막 초기화 기록 조회
    const { data, error } = await supabase
      .from('personal_character_raids_reset')
      .select('last_reset_at')
      .eq('user_id', userId)
      .eq('menu_id', menuId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = 데이터 없음
      console.error('Error checking reset status:', error)
      return false
    }

    // 기록이 없으면 초기화 필요
    if (!data) {
      return true
    }

    // 마지막 초기화 시간과 현재 주간 초기화 시간 비교
    const lastResetAt = new Date(data.last_reset_at)
    const lastWednesday6AM = getLastWednesday6AM()

    // 마지막 초기화가 이번 주 수요일 6시 이전이면 초기화 필요
    return lastResetAt < lastWednesday6AM
  } catch (error) {
    console.error('Error in shouldResetWeekly:', error)
    return false
  }
}

/**
 * 레이드 클리어 상태를 초기화합니다.
 * @param userId 사용자 ID
 * @param menuId 메뉴 ID
 */
export async function resetWeeklyRaids(
  userId: string,
  menuId: string,
): Promise<void> {
  try {
    // 1. 해당 메뉴의 모든 캐릭터 ID 조회
    const { data: characters, error: charError } = await supabase
      .from('personal_characters')
      .select('id')
      .eq('user_id', userId)
      .eq('menu_id', menuId)

    if (charError) throw charError
    if (!characters || characters.length === 0) return

    const characterIds = characters.map((c) => c.id)

    // 2. 모든 레이드의 is_cleared를 false로 초기화
    const { error: resetError } = await supabase
      .from('personal_character_raids')
      .update({ is_cleared: false })
      .in('character_id', characterIds)
      .eq('user_id', userId)

    if (resetError) throw resetError

    // 3. 초기화 기록 업데이트 또는 생성
    const { error: upsertError } = await supabase
      .from('personal_character_raids_reset')
      .upsert(
        {
          user_id: userId,
          menu_id: menuId,
          last_reset_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,menu_id',
        },
      )

    if (upsertError) throw upsertError

    console.log('Weekly raids reset successfully')
  } catch (error) {
    console.error('Error resetting weekly raids:', error)
    throw error
  }
}

