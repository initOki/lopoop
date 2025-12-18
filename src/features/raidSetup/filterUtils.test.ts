import { describe, it, expect } from 'vitest'
import type { ExpeditionCharacter } from '@/types/loa'
import {
  filterAndSortCharacters,
  validateSlots,
  serializeRaidSetupState,
  deserializeRaidSetupState,
} from './filterUtils'

// 테스트용 캐릭터 데이터
const mockCharacters: ExpeditionCharacter[] = [
  {
    CharacterName: '테스트캐릭터1',
    ItemLevel: 1650,
    ServerName: '루페온',
    CharacterClassName: '바드',
    ExpeditionIndex: 1,
  },
  {
    CharacterName: '테스트캐릭터2',
    ItemLevel: 1700,
    ServerName: '실리안',
    CharacterClassName: '버서커',
    ExpeditionIndex: 2,
  },
  {
    CharacterName: '테스트캐릭터3',
    ItemLevel: 1600,
    ServerName: '아만',
    CharacterClassName: '소서리스',
    ExpeditionIndex: 3,
  },
]

describe('filterAndSortCharacters', () => {
  it('최소 아이템 레벨 없이 모든 캐릭터를 아이템 레벨 내림차순으로 정렬', () => {
    const result = filterAndSortCharacters(mockCharacters)

    expect(result).toHaveLength(3)
    expect(result[0].ItemLevel).toBe(1700)
    expect(result[1].ItemLevel).toBe(1650)
    expect(result[2].ItemLevel).toBe(1600)
  })

  it('최소 아이템 레벨로 캐릭터를 필터링하고 정렬', () => {
    const result = filterAndSortCharacters(mockCharacters, 1650)

    expect(result).toHaveLength(2)
    expect(result[0].ItemLevel).toBe(1700)
    expect(result[1].ItemLevel).toBe(1650)
  })

  it('아이템 레벨 데이터 누락 시 0으로 처리', () => {
    const charactersWithMissingLevel = [
      ...mockCharacters,
      {
        CharacterName: '누락캐릭터',
        ItemLevel: undefined as any,
        ServerName: '루페온',
        CharacterClassName: '바드',
        ExpeditionIndex: 4,
      },
    ]

    const result = filterAndSortCharacters(charactersWithMissingLevel, 1000)

    // 누락된 아이템 레벨은 0으로 처리되어 필터링됨
    expect(result).toHaveLength(3)
    expect(result.every((c) => c.ItemLevel >= 1000)).toBe(true)
  })

  // 오류 처리 및 엣지 케이스 테스트
  it('유효하지 않은 캐릭터 배열 처리', () => {
    const result = filterAndSortCharacters(null as any)
    expect(result).toEqual([])
  })

  it('빈 캐릭터 배열 처리', () => {
    const result = filterAndSortCharacters([])
    expect(result).toEqual([])
  })

  it('유효하지 않은 캐릭터 객체 필터링', () => {
    const invalidCharacters = [
      mockCharacters[0],
      null as any,
      undefined as any,
      'invalid' as any,
      mockCharacters[1],
    ]

    const result = filterAndSortCharacters(invalidCharacters)
    expect(result).toHaveLength(2)
    expect(result[0].CharacterName).toBe('테스트캐릭터2')
    expect(result[1].CharacterName).toBe('테스트캐릭터1')
  })

  it('null 아이템 레벨 처리', () => {
    const charactersWithNullLevel = [
      {
        CharacterName: 'null레벨캐릭터',
        ItemLevel: null as any,
        ServerName: '루페온',
        CharacterClassName: '바드',
        ExpeditionIndex: 1,
      },
      mockCharacters[0],
    ]

    const result = filterAndSortCharacters(charactersWithNullLevel, 1000)
    expect(result).toHaveLength(1)
    expect(result[0].CharacterName).toBe('테스트캐릭터1')
  })
})

describe('validateSlots', () => {
  const mockSlots: (ExpeditionCharacter | null)[] = [
    mockCharacters[0], // 1650
    mockCharacters[1], // 1700
    null,
    mockCharacters[2], // 1600
  ]

  it('새로운 최소 아이템 레벨을 충족하는 슬롯은 유지', () => {
    const result = validateSlots(mockSlots, 1650)

    expect(result[0]).toBe(mockCharacters[0]) // 1650 >= 1650
    expect(result[1]).toBe(mockCharacters[1]) // 1700 >= 1650
    expect(result[2]).toBe(null) // null은 그대로 유지
    expect(result[3]).toBe(null) // 1600 < 1650이므로 null로 변경
  })

  it('모든 슬롯이 요구사항을 충족하지 않으면 모두 지움', () => {
    const result = validateSlots(mockSlots, 1800)

    expect(result[0]).toBe(null)
    expect(result[1]).toBe(null)
    expect(result[2]).toBe(null)
    expect(result[3]).toBe(null)
  })

  // 오류 처리 및 엣지 케이스 테스트
  it('유효하지 않은 슬롯 배열 처리', () => {
    const result = validateSlots(null as any, 1650)
    expect(result).toEqual([null, null, null, null])
  })

  it('유효하지 않은 최소 아이템 레벨 처리', () => {
    const result = validateSlots(mockSlots, -1)
    expect(result).toBe(mockSlots) // 원본 배열 반환
  })

  it('유효하지 않은 캐릭터 객체가 포함된 슬롯 처리', () => {
    const invalidSlots = [
      mockCharacters[0],
      'invalid' as any,
      null,
      { invalidObject: true } as any,
    ]

    const result = validateSlots(invalidSlots, 1650)
    expect(result[0]).toBe(mockCharacters[0])
    expect(result[1]).toBe(null) // 유효하지 않은 객체는 null로 변경
    expect(result[2]).toBe(null)
    expect(result[3]).toBe(null) // 유효하지 않은 객체는 null로 변경
  })

  it('아이템 레벨이 누락된 캐릭터 처리', () => {
    const slotsWithMissingLevel = [
      {
        CharacterName: '누락캐릭터',
        ItemLevel: undefined as any,
        ServerName: '루페온',
        CharacterClassName: '바드',
        ExpeditionIndex: 1,
      },
      mockCharacters[0],
      null,
      null,
    ]

    const result = validateSlots(slotsWithMissingLevel, 1000)
    expect(result[0]).toBe(null) // 아이템 레벨 0으로 처리되어 필터링됨
    expect(result[1]).toBe(mockCharacters[0])
  })
})

describe('상태 직렬화/역직렬화', () => {
  const testSlots: (ExpeditionCharacter | null)[] = [
    mockCharacters[0],
    null,
    mockCharacters[1],
    null,
  ]

  it('상태를 직렬화하고 역직렬화', () => {
    const serialized = serializeRaidSetupState('테스트 레이드', testSlots)
    expect(serialized).toBeTruthy()

    const deserialized = deserializeRaidSetupState(serialized)
    expect(deserialized).not.toBe(null)
    expect(deserialized!.selectedRaid).toBe('테스트 레이드')
    expect(deserialized!.selectedSlots).toEqual(testSlots)
    expect(typeof deserialized!.timestamp).toBe('number')
  })

  // 직렬화 오류 처리 테스트
  it('유효하지 않은 레이드 이름으로 직렬화 시 빈 문자열 반환', () => {
    const result = serializeRaidSetupState(123 as any, testSlots)
    expect(result).toBe('')
  })

  it('유효하지 않은 슬롯 배열로 직렬화 시 빈 문자열 반환', () => {
    const result = serializeRaidSetupState('테스트 레이드', 'invalid' as any)
    expect(result).toBe('')
  })

  it('잘못된 슬롯 배열 길이로 직렬화 시에도 처리', () => {
    const wrongLengthSlots = [mockCharacters[0], null] // 2개만
    const result = serializeRaidSetupState('테스트 레이드', wrongLengthSlots)
    expect(result).toBeTruthy() // 경고는 출력하지만 직렬화는 진행
  })

  // 역직렬화 오류 처리 테스트
  it('유효하지 않은 JSON은 null 반환', () => {
    const result = deserializeRaidSetupState('invalid json')
    expect(result).toBe(null)
  })

  it('빈 문자열은 null 반환', () => {
    const result = deserializeRaidSetupState('')
    expect(result).toBe(null)
  })

  it('공백만 있는 문자열은 null 반환', () => {
    const result = deserializeRaidSetupState('   ')
    expect(result).toBe(null)
  })

  it('null 입력은 null 반환', () => {
    const result = deserializeRaidSetupState(null as any)
    expect(result).toBe(null)
  })

  it('undefined 입력은 null 반환', () => {
    const result = deserializeRaidSetupState(undefined as any)
    expect(result).toBe(null)
  })

  it('숫자 입력은 null 반환', () => {
    const result = deserializeRaidSetupState(123 as any)
    expect(result).toBe(null)
  })

  it('유효하지 않은 구조는 null 반환', () => {
    const invalidState = JSON.stringify({
      selectedRaid: 123, // 문자열이어야 함
      selectedSlots: 'invalid',
      timestamp: 'invalid',
    })

    const result = deserializeRaidSetupState(invalidState)
    expect(result).toBe(null)
  })

  it('selectedRaid가 문자열이 아닌 경우 null 반환', () => {
    const invalidState = JSON.stringify({
      selectedRaid: null,
      selectedSlots: testSlots,
      timestamp: Date.now(),
    })

    const result = deserializeRaidSetupState(invalidState)
    expect(result).toBe(null)
  })

  it('selectedSlots가 배열이 아닌 경우 null 반환', () => {
    const invalidState = JSON.stringify({
      selectedRaid: '테스트 레이드',
      selectedSlots: 'not an array',
      timestamp: Date.now(),
    })

    const result = deserializeRaidSetupState(invalidState)
    expect(result).toBe(null)
  })

  it('timestamp가 숫자가 아닌 경우 null 반환', () => {
    const invalidState = JSON.stringify({
      selectedRaid: '테스트 레이드',
      selectedSlots: testSlots,
      timestamp: 'not a number',
    })

    const result = deserializeRaidSetupState(invalidState)
    expect(result).toBe(null)
  })

  it('잘못된 슬롯 배열 길이는 조정하여 복원', () => {
    const wrongLengthState = JSON.stringify({
      selectedRaid: '테스트 레이드',
      selectedSlots: [mockCharacters[0], mockCharacters[1]], // 2개만
      timestamp: Date.now(),
    })

    const result = deserializeRaidSetupState(wrongLengthState)
    expect(result).not.toBe(null)
    expect(result!.selectedSlots).toHaveLength(4)
    expect(result!.selectedSlots[0]).toEqual(mockCharacters[0])
    expect(result!.selectedSlots[1]).toEqual(mockCharacters[1])
    expect(result!.selectedSlots[2]).toBe(null)
    expect(result!.selectedSlots[3]).toBe(null)
  })

  it('유효하지 않은 캐릭터 슬롯은 null로 변경', () => {
    const invalidSlotState = JSON.stringify({
      selectedRaid: '테스트 레이드',
      selectedSlots: [
        mockCharacters[0],
        'invalid character',
        { invalidCharacter: true },
        null,
      ],
      timestamp: Date.now(),
    })

    const result = deserializeRaidSetupState(invalidSlotState)
    expect(result).not.toBe(null)
    expect(result!.selectedSlots[0]).toEqual(mockCharacters[0])
    expect(result!.selectedSlots[1]).toBe(null) // 유효하지 않은 캐릭터는 null로 변경
    expect(result!.selectedSlots[2]).toBe(null) // 유효하지 않은 캐릭터는 null로 변경
    expect(result!.selectedSlots[3]).toBe(null)
  })

  it('필수 필드가 누락된 캐릭터는 null로 변경', () => {
    const incompleteCharacterState = JSON.stringify({
      selectedRaid: '테스트 레이드',
      selectedSlots: [
        mockCharacters[0],
        {
          CharacterName: '불완전캐릭터',
          // ItemLevel 누락
          ServerName: '루페온',
          CharacterClassName: '바드',
          ExpeditionIndex: 1,
        },
        null,
        null,
      ],
      timestamp: Date.now(),
    })

    const result = deserializeRaidSetupState(incompleteCharacterState)
    expect(result).not.toBe(null)
    expect(result!.selectedSlots[0]).toEqual(mockCharacters[0])
    expect(result!.selectedSlots[1]).toBe(null) // 불완전한 캐릭터는 null로 변경
  })
})
