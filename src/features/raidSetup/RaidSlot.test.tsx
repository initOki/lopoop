import { describe, it, expect } from 'vitest'
import { filterAndSortCharacters } from './filterUtils'
import type { ExpeditionCharacter } from '@/types/loa'

// Mock characters for testing
const mockCharacters: ExpeditionCharacter[] = [
  {
    CharacterName: '고레벨캐릭터',
    ItemLevel: 1600,
    ServerName: '루페온',
    CharacterClassName: '바드',
    ExpeditionIndex: 1,
  },
  {
    CharacterName: '중간레벨캐릭터',
    ItemLevel: 1550,
    ServerName: '루페온',
    CharacterClassName: '버서커',
    ExpeditionIndex: 1,
  },
  {
    CharacterName: '저레벨캐릭터',
    ItemLevel: 1500,
    ServerName: '루페온',
    CharacterClassName: '소서리스',
    ExpeditionIndex: 1,
  },
]

describe('RaidSlot 필터링 로직', () => {
  it('minItemLevel이 없으면 모든 캐릭터를 반환한다', () => {
    const result = filterAndSortCharacters(mockCharacters)
    expect(result).toHaveLength(3)
    expect(result[0].CharacterName).toBe('고레벨캐릭터') // 가장 높은 아이템 레벨
  })

  it('minItemLevel이 설정되면 해당 레벨 이상의 캐릭터만 반환한다', () => {
    const result = filterAndSortCharacters(mockCharacters, 1570)
    expect(result).toHaveLength(1)
    expect(result[0].CharacterName).toBe('고레벨캐릭터')
  })

  it('모든 캐릭터가 필터링되면 빈 배열을 반환한다', () => {
    const result = filterAndSortCharacters(mockCharacters, 1700)
    expect(result).toHaveLength(0)
  })

  it('아이템 레벨이 누락된 캐릭터는 0으로 처리된다', () => {
    const charactersWithMissingItemLevel: ExpeditionCharacter[] = [
      {
        CharacterName: '누락캐릭터',
        ItemLevel: undefined as any, // 아이템 레벨 누락
        ServerName: '루페온',
        CharacterClassName: '바드',
        ExpeditionIndex: 1,
      },
      ...mockCharacters,
    ]

    const result = filterAndSortCharacters(charactersWithMissingItemLevel, 1000)
    // 아이템 레벨이 누락된 캐릭터는 필터링되어야 함 (0 < 1000)
    expect(result).toHaveLength(3)
    expect(result.every((c) => c.CharacterName !== '누락캐릭터')).toBe(true)
  })

  it('캐릭터들이 아이템 레벨 내림차순으로 정렬된다', () => {
    const result = filterAndSortCharacters(mockCharacters)
    expect(result[0].ItemLevel).toBe(1600) // 고레벨캐릭터
    expect(result[1].ItemLevel).toBe(1550) // 중간레벨캐릭터
    expect(result[2].ItemLevel).toBe(1500) // 저레벨캐릭터
  })
})
