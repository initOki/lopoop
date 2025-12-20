import type { ExpeditionCharacter } from '@/types/loa'
import { toast } from 'sonner'

/**
 * 캐릭터 필터링 및 정렬 함수
 * 유효한 캐릭터만 필터링하고 아이템 레벨 내림차순으로 정렬 (최소 아이템 레벨 필터링 제거)
 */
export function filterAndSortCharacters(
  characters: ExpeditionCharacter[],
): ExpeditionCharacter[] {
  console.log(characters)
  // 입력 검증
  if (!Array.isArray(characters)) {
    console.warn(
      'filterAndSortCharacters: 유효하지 않은 캐릭터 배열:',
      characters,
    )
    return []
  }

  // 1단계: 유효한 캐릭터만 필터링 (아이템 레벨 조건 제거)
  const filtered = characters.filter((c) => {
    // 캐릭터 객체 유효성 검사
    if (!c || typeof c !== 'object') {
      console.warn('filterAndSortCharacters: 유효하지 않은 캐릭터 객체:', c)
      return false
    }

    // 아이템 레벨 데이터 누락 경고
    if (c.ItemLevel === undefined || c.ItemLevel === null) {
      console.warn(
        `캐릭터 "${c.CharacterName || '알 수 없음'}"의 아이템 레벨 데이터가 누락되어 0으로 처리됩니다.`,
      )
    }

    return true
  })

  // 2단계: 아이템 레벨 내림차순으로 정렬
  return [...filtered].sort((a, b) => {
    const aItemLevel = a.ItemLevel ?? 0
    const bItemLevel = b.ItemLevel ?? 0
    return bItemLevel - aItemLevel
  })
}

/**
 * 슬롯 검증 함수
 * 레이드 변경 시 기존 슬롯 선택이 새로운 최소 아이템 레벨을 충족하는지 검증
 */
export function validateSlots(
  slots: (ExpeditionCharacter | null)[],
  newMinItemLevel: number,
): (ExpeditionCharacter | null)[] {
  // 입력 검증
  if (!Array.isArray(slots)) {
    console.warn('validateSlots: 유효하지 않은 슬롯 배열:', slots)
    return [null, null, null, null]
  }

  if (typeof newMinItemLevel !== 'number' || newMinItemLevel < 0) {
    console.warn(
      'validateSlots: 유효하지 않은 최소 아이템 레벨:',
      newMinItemLevel,
    )
    return slots
  }

  return slots.map((slot, index) => {
    if (slot === null) return null

    // 슬롯 객체 유효성 검사
    if (typeof slot !== 'object') {
      console.warn(
        `validateSlots: 슬롯 ${index + 1}에 유효하지 않은 캐릭터 객체:`,
        slot,
      )
      return null
    }

    // 아이템 레벨 데이터 누락 시 0으로 처리
    const itemLevel = slot.ItemLevel ?? 0

    // 아이템 레벨 데이터 누락 경고
    if (slot.ItemLevel === undefined || slot.ItemLevel === null) {
      console.warn(
        `슬롯 ${index + 1}의 캐릭터 "${slot.CharacterName || '알 수 없음'}"의 아이템 레벨 데이터가 누락되어 0으로 처리됩니다.`,
      )
    }

    const isValid = itemLevel >= newMinItemLevel

    if (!isValid) {
      toast.warning(
        `슬롯 ${index + 1}의 캐릭터 "${slot.CharacterName}"이 최소 아이템 레벨 ${newMinItemLevel}을 충족하지 않아 제거됩니다. (현재: ${itemLevel})`,
      )
    }

    return isValid ? slot : null
  })
}

/**
 * 직렬화 가능한 레이드 설정 상태 타입
 */
export type SerializableRaidSetupState = {
  selectedRaid: string
  selectedSlots: (ExpeditionCharacter | null)[]
  timestamp: number
}

/**
 * 레이드 설정 상태 직렬화 함수
 * 상태를 JSON 문자열로 변환하여 저장 가능한 형태로 만듦
 */
export function serializeRaidSetupState(
  selectedRaid: string,
  selectedSlots: (ExpeditionCharacter | null)[],
): string {
  try {
    // 입력 검증
    if (typeof selectedRaid !== 'string') {
      console.warn(
        'serializeRaidSetupState: 유효하지 않은 레이드 이름:',
        selectedRaid,
      )
      return ''
    }

    if (!Array.isArray(selectedSlots)) {
      console.warn(
        'serializeRaidSetupState: 유효하지 않은 슬롯 배열:',
        selectedSlots,
      )
      return ''
    }

    if (selectedSlots.length !== 4) {
      console.warn(
        `serializeRaidSetupState: 슬롯 배열 길이가 4가 아닙니다: ${selectedSlots.length}`,
      )
    }

    const state: SerializableRaidSetupState = {
      selectedRaid,
      selectedSlots,
      timestamp: Date.now(),
    }
    return JSON.stringify(state)
  } catch (error) {
    console.error('레이드 설정 상태 직렬화 실패:', error)
    if (error instanceof Error) {
      console.error('오류 메시지:', error.message)
      console.error('오류 스택:', error.stack)
    }
    return ''
  }
}

/**
 * 레이드 설정 상태 역직렬화 함수
 * JSON 문자열을 파싱하여 상태 객체로 복원
 */
export function deserializeRaidSetupState(
  serializedState: string,
): SerializableRaidSetupState | null {
  try {
    // 입력 검증
    if (typeof serializedState !== 'string') {
      console.warn(
        'deserializeRaidSetupState: 입력이 문자열이 아닙니다:',
        typeof serializedState,
      )
      return null
    }

    if (!serializedState || serializedState.trim() === '') {
      return null
    }

    let parsed: any
    try {
      parsed = JSON.parse(serializedState)
    } catch (parseError) {
      console.warn('deserializeRaidSetupState: JSON 파싱 실패:', parseError)
      console.warn('입력 데이터:', serializedState.substring(0, 100) + '...')
      return null
    }

    // 기본 구조 검증
    if (typeof parsed !== 'object' || parsed === null) {
      console.warn(
        'deserializeRaidSetupState: 파싱된 데이터가 객체가 아닙니다:',
        parsed,
      )
      return null
    }

    if (typeof parsed.selectedRaid !== 'string') {
      console.warn(
        'deserializeRaidSetupState: selectedRaid가 문자열이 아닙니다:',
        parsed.selectedRaid,
      )
      return null
    }

    if (!Array.isArray(parsed.selectedSlots)) {
      console.warn(
        'deserializeRaidSetupState: selectedSlots가 배열이 아닙니다:',
        parsed.selectedSlots,
      )
      return null
    }

    if (typeof parsed.timestamp !== 'number') {
      console.warn(
        'deserializeRaidSetupState: timestamp가 숫자가 아닙니다:',
        parsed.timestamp,
      )
      return null
    }

    // 슬롯 배열 검증 (4개 슬롯이어야 함)
    if (parsed.selectedSlots.length !== 4) {
      console.warn(
        `deserializeRaidSetupState: 슬롯 배열 길이가 4가 아닙니다: ${parsed.selectedSlots.length}. 기본값으로 복원을 시도합니다.`,
      )
      // 길이가 맞지 않으면 기본 4슬롯 배열로 조정
      const adjustedSlots = [null, null, null, null]
      for (let i = 0; i < Math.min(4, parsed.selectedSlots.length); i++) {
        adjustedSlots[i] = parsed.selectedSlots[i]
      }
      parsed.selectedSlots = adjustedSlots
    }

    // 각 슬롯이 null이거나 유효한 ExpeditionCharacter 구조인지 검증
    for (let i = 0; i < parsed.selectedSlots.length; i++) {
      const slot = parsed.selectedSlots[i]
      if (slot !== null) {
        if (typeof slot !== 'object') {
          console.warn(
            `deserializeRaidSetupState: 슬롯 ${i + 1}이 객체가 아닙니다:`,
            slot,
          )
          parsed.selectedSlots[i] = null
          continue
        }

        // 필수 필드 검증
        const requiredFields = [
          { name: 'CharacterName', type: 'string' },
          { name: 'ItemLevel', type: 'number' },
          { name: 'ServerName', type: 'string' },
          { name: 'CharacterClassName', type: 'string' },
          { name: 'ExpeditionIndex', type: 'number' },
        ]

        let isValidSlot = true
        for (const field of requiredFields) {
          if (typeof slot[field.name] !== field.type) {
            console.warn(
              `deserializeRaidSetupState: 슬롯 ${i + 1}의 ${field.name}이 ${field.type}이 아닙니다:`,
              slot[field.name],
            )
            isValidSlot = false
            break
          }
        }

        if (!isValidSlot) {
          console.warn(
            `deserializeRaidSetupState: 슬롯 ${i + 1}을 null로 설정합니다.`,
          )
          parsed.selectedSlots[i] = null
        }
      }
    }

    // 타임스탬프 유효성 검사 (너무 오래된 데이터 감지)
    const now = Date.now()
    const maxAge = 30 * 24 * 60 * 60 * 1000 // 30일
    if (now - parsed.timestamp > maxAge) {
      console.warn(
        `deserializeRaidSetupState: 저장된 데이터가 너무 오래되었습니다. (${Math.floor((now - parsed.timestamp) / (24 * 60 * 60 * 1000))}일 전)`,
      )
    }

    return parsed as SerializableRaidSetupState
  } catch (error) {
    console.error('deserializeRaidSetupState: 예상치 못한 오류:', error)
    if (error instanceof Error) {
      console.error('오류 메시지:', error.message)
      console.error('오류 스택:', error.stack)
    }
    return null
  }
}
