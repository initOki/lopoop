import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RaidSetup from './RaidSetup'
import type { ExpeditionCharacter } from '@/types/loa'

// Mock 캐릭터 데이터
const mockCharacters: ExpeditionCharacter[] = [
  {
    CharacterName: '고레벨캐릭터',
    ItemLevel: 1700,
    ServerName: '루페온',
    CharacterClassName: '바드',
    ExpeditionIndex: 1,
  },
  {
    CharacterName: '저레벨캐릭터',
    ItemLevel: 1600,
    ServerName: '루페온',
    CharacterClassName: '버서커',
    ExpeditionIndex: 1,
  },
]

describe('RaidSetup 슬롯 검증', () => {
  it('레이드 변경 시 유효하지 않은 슬롯이 지워져야 함', () => {
    const mockOnSlotsChange = vi.fn()
    const mockOnRaidChange = vi.fn()

    // 초기 슬롯에 저레벨 캐릭터가 선택되어 있음
    const initialSlots = [mockCharacters[1], null, null, null] // 1600 아이템 레벨

    const { rerender } = render(
      <RaidSetup
        selectedSlots={initialSlots}
        onSlotsChange={mockOnSlotsChange}
        selectedRaid=""
        onRaidChange={mockOnRaidChange}
      />,
    )

    // 높은 아이템 레벨 요구사항의 레이드로 변경 (1680 이상)
    rerender(
      <RaidSetup
        selectedSlots={initialSlots}
        onSlotsChange={mockOnSlotsChange}
        selectedRaid="1막 / 에기르 하드"
        onRaidChange={mockOnRaidChange}
      />,
    )

    // 슬롯이 지워져야 함 (1600 < 1680)
    expect(mockOnSlotsChange).toHaveBeenCalledWith([null, null, null, null])
  })

  it('레이드 변경 시 유효한 슬롯은 유지되어야 함', () => {
    const mockOnSlotsChange = vi.fn()
    const mockOnRaidChange = vi.fn()

    // 초기 슬롯에 고레벨 캐릭터가 선택되어 있음
    const initialSlots = [mockCharacters[0], null, null, null] // 1700 아이템 레벨

    const { rerender } = render(
      <RaidSetup
        selectedSlots={initialSlots}
        onSlotsChange={mockOnSlotsChange}
        selectedRaid=""
        onRaidChange={mockOnRaidChange}
      />,
    )

    // 낮은 아이템 레벨 요구사항의 레이드로 변경 (1660)
    rerender(
      <RaidSetup
        selectedSlots={initialSlots}
        onSlotsChange={mockOnSlotsChange}
        selectedRaid="베히모스"
        onRaidChange={mockOnRaidChange}
      />,
    )

    // 슬롯이 유지되어야 함 (1700 >= 1660)
    expect(mockOnSlotsChange).not.toHaveBeenCalled()
  })

  it('"레이드 선택 안함"으로 변경 시 모든 선택이 유지되어야 함', () => {
    const mockOnSlotsChange = vi.fn()
    const mockOnRaidChange = vi.fn()

    // 초기 슬롯에 저레벨 캐릭터가 선택되어 있음
    const initialSlots = [mockCharacters[1], null, null, null] // 1600 아이템 레벨

    const { rerender } = render(
      <RaidSetup
        selectedSlots={initialSlots}
        onSlotsChange={mockOnSlotsChange}
        selectedRaid="1막 / 에기르 하드" // 1680 요구사항
        onRaidChange={mockOnRaidChange}
      />,
    )

    // "레이드 선택 안함"으로 변경
    rerender(
      <RaidSetup
        selectedSlots={initialSlots}
        onSlotsChange={mockOnSlotsChange}
        selectedRaid=""
        onRaidChange={mockOnRaidChange}
      />,
    )

    // 슬롯이 유지되어야 함
    expect(mockOnSlotsChange).not.toHaveBeenCalled()
  })

  // 오류 처리 및 엣지 케이스 테스트
  it('유효하지 않은 레이드 선택 시 "레이드 선택 안함"으로 처리', () => {
    const mockOnSlotsChange = vi.fn()
    const mockOnRaidChange = vi.fn()

    render(
      <RaidSetup
        selectedSlots={[null, null, null, null]}
        onSlotsChange={mockOnSlotsChange}
        selectedRaid="존재하지않는레이드"
        onRaidChange={mockOnRaidChange}
      />,
    )

    // 유효하지 않은 레이드는 빈 문자열로 변경되어야 함
    expect(mockOnRaidChange).toHaveBeenCalledWith('')
  })

  it('빈 캐릭터 목록에서도 정상 동작', () => {
    const mockOnSlotsChange = vi.fn()
    const mockOnRaidChange = vi.fn()

    const { container } = render(
      <RaidSetup
        selectedSlots={[null, null, null, null]}
        onSlotsChange={mockOnSlotsChange}
        selectedRaid="베히모스"
        onRaidChange={mockOnRaidChange}
      />,
    )

    // 컴포넌트가 정상적으로 렌더링되어야 함
    expect(container.querySelector('select')).not.toBe(null)
  })
})
