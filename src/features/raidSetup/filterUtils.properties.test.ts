import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { ExpeditionCharacter } from '@/types/loa'
import { raidList } from '@/lib/raid-list'
import {
  filterAndSortCharacters,
  validateSlots,
  serializeRaidSetupState,
  deserializeRaidSetupState,
} from './filterUtils'

// 캐릭터 생성기
const characterGen = fc.record({
  CharacterName: fc.string({ minLength: 1, maxLength: 20 }),
  ItemLevel: fc.integer({ min: 1000, max: 2000 }),
  ServerName: fc.string({ minLength: 1, maxLength: 10 }),
  CharacterClassName: fc.string({ minLength: 1, maxLength: 10 }),
  ExpeditionIndex: fc.integer({ min: 1, max: 4 }),
}) as fc.Arbitrary<ExpeditionCharacter>

// 캐릭터 배열 생성기
const charactersGen = fc.array(characterGen, { minLength: 0, maxLength: 20 })

// 최소 아이템 레벨 생성기
const minItemLevelGen = fc.integer({ min: 1000, max: 2000 })

// 슬롯 배열 생성기 (4개 슬롯, 각각 null이거나 캐릭터)
const slotsGen = fc.array(fc.option(characterGen, { nil: null }), {
  minLength: 4,
  maxLength: 4,
})

// 레이드 이름 생성기 (실제 레이드 목록에서 선택)
const raidNameGen = fc.oneof(
  fc.constant(''), // 레이드 선택 안함
  fc.constantFrom(...raidList.map((raid) => raid.name)),
)

describe('레이드 캐릭터 필터링 속성', () => {
  it('속성 1: 레이드 선택 상태 저장', () => {
    // **Feature: raid-character-filtering, Property 1: Raid selection state storage**
    fc.assert(
      fc.property(
        fc.constantFrom(...raidList.map((raid) => raid.name)), // 유효한 레이드 이름만 선택
        (selectedRaidName) => {
          // 레이드 목록에서 선택된 레이드 정보 찾기
          const selectedRaidInfo = raidList.find(
            (raid) => raid.name === selectedRaidName,
          )

          // 선택된 레이드가 레이드 목록에 존재해야 함
          expect(selectedRaidInfo).toBeDefined()

          if (selectedRaidInfo) {
            // 시스템 상태가 레이드 이름과 최소 아이템 레벨을 모두 포함해야 함
            expect(selectedRaidInfo.name).toBe(selectedRaidName)
            expect(typeof selectedRaidInfo.minItemLevel).toBe('number')
            expect(selectedRaidInfo.minItemLevel).toBeGreaterThan(0)

            // 최소 아이템 레벨이 합리적인 범위 내에 있어야 함 (로스트아크 아이템 레벨 범위)
            expect(selectedRaidInfo.minItemLevel).toBeGreaterThanOrEqual(1000)
            expect(selectedRaidInfo.minItemLevel).toBeLessThanOrEqual(2000)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('속성 3: 캐릭터 필터링 정확성', () => {
    // **Feature: raid-character-filtering, Property 3: Character filtering accuracy**
    fc.assert(
      fc.property(
        charactersGen,
        minItemLevelGen,
        (characters, minItemLevel) => {
          const result = filterAndSortCharacters(characters, minItemLevel)

          // 모든 결과 캐릭터는 최소 아이템 레벨 이상이어야 함
          for (const character of result) {
            const itemLevel = character.ItemLevel ?? 0
            expect(itemLevel).toBeGreaterThanOrEqual(minItemLevel)
          }

          // 결과는 원본 캐릭터의 부분집합이어야 함
          for (const character of result) {
            expect(characters).toContain(character)
          }

          // 원본에서 조건을 만족하는 모든 캐릭터가 결과에 포함되어야 함
          const expectedCharacters = characters.filter(
            (c) => (c.ItemLevel ?? 0) >= minItemLevel,
          )
          expect(result).toHaveLength(expectedCharacters.length)

          // 결과는 아이템 레벨 내림차순으로 정렬되어야 함
          for (let i = 0; i < result.length - 1; i++) {
            const currentItemLevel = result[i].ItemLevel ?? 0
            const nextItemLevel = result[i + 1].ItemLevel ?? 0
            expect(currentItemLevel).toBeGreaterThanOrEqual(nextItemLevel)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('속성 4: 정렬 순서 유지', () => {
    // **Feature: raid-character-filtering, Property 4: Sort order maintenance**
    fc.assert(
      fc.property(
        charactersGen,
        fc.option(minItemLevelGen, { nil: undefined }),
        (characters, minItemLevel) => {
          const result = filterAndSortCharacters(characters, minItemLevel)

          // 정렬 순서 검증: 모든 인접한 캐릭터 쌍에 대해 ItemLevel 내림차순 확인
          for (let i = 0; i < result.length - 1; i++) {
            const currentItemLevel = result[i].ItemLevel ?? 0
            const nextItemLevel = result[i + 1].ItemLevel ?? 0
            expect(currentItemLevel).toBeGreaterThanOrEqual(nextItemLevel)
          }

          // 정렬이 안정적인지 확인: 같은 ItemLevel을 가진 캐릭터들의 상대적 순서 유지
          // (이는 JavaScript의 sort가 안정 정렬이므로 보장됨)
          const groupedByLevel = new Map<number, ExpeditionCharacter[]>()

          // 원본에서 같은 레벨 캐릭터들의 순서 기록
          for (const char of characters) {
            const level = char.ItemLevel ?? 0
            if (!groupedByLevel.has(level)) {
              groupedByLevel.set(level, [])
            }
            groupedByLevel.get(level)!.push(char)
          }

          // 결과에서 같은 레벨 캐릭터들이 원본 순서를 유지하는지 확인
          let currentIndex = 0
          const levelGroups = Array.from(groupedByLevel.entries()).sort(
            ([a], [b]) => b - a,
          ) // 레벨 내림차순 정렬

          for (const [level, originalChars] of levelGroups) {
            // 이 레벨의 캐릭터들이 필터링을 통과했는지 확인
            const shouldInclude =
              minItemLevel === undefined || level >= minItemLevel
            if (!shouldInclude) continue

            const resultCharsAtLevel = []
            while (
              currentIndex < result.length &&
              (result[currentIndex].ItemLevel ?? 0) === level
            ) {
              resultCharsAtLevel.push(result[currentIndex])
              currentIndex++
            }

            // 같은 레벨의 캐릭터들이 원본 순서를 유지하는지 확인
            const originalFiltered = originalChars.filter(
              (char) =>
                minItemLevel === undefined ||
                (char.ItemLevel ?? 0) >= minItemLevel,
            )
            expect(resultCharsAtLevel).toEqual(originalFiltered)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('속성 2: 레이드 변경 시 필터링 업데이트', () => {
    // **Feature: raid-character-filtering, Property 2: Raid change filtering update**
    fc.assert(
      fc.property(
        charactersGen, // 캐릭터 목록
        fc.constantFrom(...raidList.map((raid) => raid.name)), // 두 번째 레이드 (변경될 레이드)
        (characters, secondRaidName) => {
          // 두 번째 레이드 정보 가져오기 (레이드 변경 대상)
          const secondRaid = raidList.find(
            (raid) => raid.name === secondRaidName,
          )!

          // 두 번째 레이드로 필터링 (레이드 변경 시뮬레이션)
          const secondFiltering = filterAndSortCharacters(
            characters,
            secondRaid.minItemLevel,
          )

          // 두 번째 레이드의 필터링 결과는 새로운 최소 아이템 레벨을 반영해야 함
          for (const character of secondFiltering) {
            const itemLevel = character.ItemLevel ?? 0
            expect(itemLevel).toBeGreaterThanOrEqual(secondRaid.minItemLevel)
          }

          // 두 번째 레이드의 최소 아이템 레벨을 충족하지 않는 캐릭터는 제외되어야 함
          const excludedCharacters = characters.filter(
            (c) => (c.ItemLevel ?? 0) < secondRaid.minItemLevel,
          )
          for (const excludedChar of excludedCharacters) {
            expect(secondFiltering).not.toContain(excludedChar)
          }

          // 두 번째 레이드의 최소 아이템 레벨을 충족하는 모든 캐릭터가 포함되어야 함
          const expectedCharacters = characters.filter(
            (c) => (c.ItemLevel ?? 0) >= secondRaid.minItemLevel,
          )
          expect(secondFiltering).toHaveLength(expectedCharacters.length)

          // 정렬 순서가 유지되어야 함 (아이템 레벨 내림차순)
          for (let i = 0; i < secondFiltering.length - 1; i++) {
            const currentItemLevel = secondFiltering[i].ItemLevel ?? 0
            const nextItemLevel = secondFiltering[i + 1].ItemLevel ?? 0
            expect(currentItemLevel).toBeGreaterThanOrEqual(nextItemLevel)
          }

          // 레이드 변경이 즉시 반영되는지 확인 (함수형 접근으로 즉시성 보장)
          // 같은 캐릭터 목록에 대해 다시 필터링해도 동일한 결과가 나와야 함
          const reFiltering = filterAndSortCharacters(
            characters,
            secondRaid.minItemLevel,
          )
          expect(reFiltering).toEqual(secondFiltering)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('속성 7: 동적 캐릭터 필터링', () => {
    // **Feature: raid-character-filtering, Property 7: Dynamic character filtering**
    fc.assert(
      fc.property(
        charactersGen, // 기존 캐릭터 목록
        charactersGen, // 새로 로드된 캐릭터 목록 (계정 검색 결과)
        minItemLevelGen, // 선택된 레이드의 최소 아이템 레벨
        (existingCharacters, newCharacters, minItemLevel) => {
          // 새로운 캐릭터가 원정대에 로드되는 상황을 시뮬레이션
          const allCharacters = [...existingCharacters, ...newCharacters]

          // 레이드가 선택된 상태에서 필터링 적용
          const filteredResult = filterAndSortCharacters(
            allCharacters,
            minItemLevel,
          )

          // 모든 결과 캐릭터는 최소 아이템 레벨 이상이어야 함
          for (const character of filteredResult) {
            const itemLevel = character.ItemLevel ?? 0
            expect(itemLevel).toBeGreaterThanOrEqual(minItemLevel)
          }

          // 새로 로드된 캐릭터들도 동일한 필터링 규칙이 적용되어야 함
          const newCharactersInResult = filteredResult.filter((char) =>
            newCharacters.includes(char),
          )

          // 새로 로드된 캐릭터 중 조건을 만족하는 모든 캐릭터가 결과에 포함되어야 함
          const expectedNewCharacters = newCharacters.filter(
            (c) => (c.ItemLevel ?? 0) >= minItemLevel,
          )

          for (const expectedChar of expectedNewCharacters) {
            expect(newCharactersInResult).toContain(expectedChar)
          }

          // 새로 로드된 캐릭터 중 조건을 만족하지 않는 캐릭터는 결과에 포함되지 않아야 함
          const unexpectedNewCharacters = newCharacters.filter(
            (c) => (c.ItemLevel ?? 0) < minItemLevel,
          )

          for (const unexpectedChar of unexpectedNewCharacters) {
            expect(newCharactersInResult).not.toContain(unexpectedChar)
          }

          // 기존 캐릭터와 새로운 캐릭터가 함께 올바르게 정렬되어야 함
          for (let i = 0; i < filteredResult.length - 1; i++) {
            const currentItemLevel = filteredResult[i].ItemLevel ?? 0
            const nextItemLevel = filteredResult[i + 1].ItemLevel ?? 0
            expect(currentItemLevel).toBeGreaterThanOrEqual(nextItemLevel)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('속성 5: 유효한 선택 유지', () => {
    // **Feature: raid-character-filtering, Property 5: Valid selection retention**
    fc.assert(
      fc.property(
        slotsGen, // 현재 슬롯 선택 (4개 슬롯)
        fc.integer({ min: 1000, max: 1800 }), // 레이드 B의 최소 아이템 레벨 (Y)
        (originalSlots, minLevelB) => {
          // 레이드 A에서 레이드 B로 변경하는 상황을 시뮬레이션
          // validateSlots 함수를 사용하여 슬롯 검증 수행
          const validatedSlots = validateSlots(originalSlots, minLevelB)

          // 각 슬롯에 대해 검증
          for (let i = 0; i < originalSlots.length; i++) {
            const originalSlot = originalSlots[i]
            const validatedSlot = validatedSlots[i]

            if (originalSlot === null) {
              // 원래 슬롯이 null이면 검증 후에도 null이어야 함
              expect(validatedSlot).toBeNull()
            } else {
              // 캐릭터 C가 슬롯에 선택되어 있는 경우
              const characterItemLevel = originalSlot.ItemLevel ?? 0

              if (characterItemLevel >= minLevelB) {
                // C.ItemLevel >= Y이면, 레이드 변경 후에도 C는 해당 슬롯에 선택된 상태로 유지되어야 함
                expect(validatedSlot).not.toBeNull()
                expect(validatedSlot).toEqual(originalSlot)

                // 캐릭터의 모든 속성이 동일하게 유지되어야 함
                if (validatedSlot !== null) {
                  expect(validatedSlot.CharacterName).toBe(
                    originalSlot.CharacterName,
                  )
                  expect(validatedSlot.ItemLevel).toBe(originalSlot.ItemLevel)
                  expect(validatedSlot.ServerName).toBe(originalSlot.ServerName)
                  expect(validatedSlot.CharacterClassName).toBe(
                    originalSlot.CharacterClassName,
                  )
                  expect(validatedSlot.ExpeditionIndex).toBe(
                    originalSlot.ExpeditionIndex,
                  )
                }
              } else {
                // C.ItemLevel < Y이면, 해당 슬롯은 지워져야 함 (이는 속성 6에서 테스트됨)
                // 여기서는 유효한 선택 유지만 테스트하므로 이 경우는 검증하지 않음
              }
            }
          }

          // 검증된 슬롯 배열의 길이는 원본과 동일해야 함
          expect(validatedSlots).toHaveLength(originalSlots.length)

          // 검증 함수는 순수 함수여야 하므로 원본 배열을 변경하지 않아야 함
          expect(originalSlots).toHaveLength(4) // 원본 길이 유지
        },
      ),
      { numRuns: 100 },
    )
  })

  it('속성 6: 유효하지 않은 선택 지우기', () => {
    // **Feature: raid-character-filtering, Property 6: Invalid selection clearing**
    fc.assert(
      fc.property(
        slotsGen, // 현재 슬롯 선택 (4개 슬롯)
        fc.integer({ min: 1000, max: 1800 }), // 레이드 B의 최소 아이템 레벨 (Y)
        (originalSlots, minLevelB) => {
          // 레이드 A에서 레이드 B로 변경하는 상황을 시뮬레이션
          // validateSlots 함수를 사용하여 슬롯 검증 수행
          const validatedSlots = validateSlots(originalSlots, minLevelB)

          // 각 슬롯에 대해 검증
          for (let i = 0; i < originalSlots.length; i++) {
            const originalSlot = originalSlots[i]
            const validatedSlot = validatedSlots[i]

            if (originalSlot === null) {
              // 원래 슬롯이 null이면 검증 후에도 null이어야 함
              expect(validatedSlot).toBeNull()
            } else {
              // 캐릭터 C가 슬롯에 선택되어 있는 경우
              const characterItemLevel = originalSlot.ItemLevel ?? 0

              if (characterItemLevel < minLevelB) {
                // C.ItemLevel < Y이면, 레이드 변경 후 해당 슬롯은 지워져야 함 (null로 설정)
                expect(validatedSlot).toBeNull()
              } else {
                // C.ItemLevel >= Y이면, 캐릭터가 유지되어야 함 (속성 5에서도 테스트됨)
                expect(validatedSlot).not.toBeNull()
                expect(validatedSlot).toEqual(originalSlot)
              }
            }
          }

          // 검증된 슬롯 배열의 길이는 원본과 동일해야 함
          expect(validatedSlots).toHaveLength(originalSlots.length)

          // 모든 유효하지 않은 선택이 동시에 지워져야 함
          // (여러 슬롯에 더 이상 요구사항을 충족하지 않는 캐릭터가 포함되어 있을 때)
          const invalidSlotCount = originalSlots.filter(
            (slot) => slot !== null && (slot.ItemLevel ?? 0) < minLevelB,
          ).length

          const clearedSlotCount = validatedSlots.filter(
            (slot, index) => originalSlots[index] !== null && slot === null,
          ).length

          // 지워진 슬롯의 수는 유효하지 않은 슬롯의 수와 같아야 함
          expect(clearedSlotCount).toBe(invalidSlotCount)

          // 검증 함수는 순수 함수여야 하므로 원본 배열을 변경하지 않아야 함
          expect(originalSlots).toHaveLength(4) // 원본 길이 유지
        },
      ),
      { numRuns: 100 },
    )
  })

  it('속성 8: 슬롯 재검증', () => {
    // **Feature: raid-character-filtering, Property 8: Slot revalidation**
    fc.assert(
      fc.property(
        slotsGen, // 기존 슬롯 선택 (계정 검색 완료 전)
        minItemLevelGen, // 선택된 레이드의 최소 아이템 레벨
        (existingSlots, selectedRaidMinLevel) => {
          // 계정 검색이 완료되고 레이드가 선택되어 있는 상황을 시뮬레이션
          // 기존 슬롯 선택을 새로운 최소 아이템 레벨 요구사항에 대해 재검증

          const revalidatedSlots = validateSlots(
            existingSlots,
            selectedRaidMinLevel,
          )

          // 재검증된 슬롯 배열의 길이는 원본과 동일해야 함
          expect(revalidatedSlots).toHaveLength(existingSlots.length)

          // 각 슬롯에 대해 재검증 결과 확인
          for (let i = 0; i < existingSlots.length; i++) {
            const originalSlot = existingSlots[i]
            const revalidatedSlot = revalidatedSlots[i]

            if (originalSlot === null) {
              // 원래 슬롯이 null이면 재검증 후에도 null이어야 함
              expect(revalidatedSlot).toBeNull()
            } else {
              // 캐릭터가 선택되어 있던 슬롯의 경우
              const characterItemLevel = originalSlot.ItemLevel ?? 0

              if (characterItemLevel >= selectedRaidMinLevel) {
                // 최소 아이템 레벨을 충족하는 캐릭터는 유지되어야 함
                expect(revalidatedSlot).not.toBeNull()
                expect(revalidatedSlot).toEqual(originalSlot)

                // 캐릭터의 모든 속성이 동일하게 유지되어야 함
                if (revalidatedSlot !== null) {
                  expect(revalidatedSlot.CharacterName).toBe(
                    originalSlot.CharacterName,
                  )
                  expect(revalidatedSlot.ItemLevel).toBe(originalSlot.ItemLevel)
                  expect(revalidatedSlot.ServerName).toBe(
                    originalSlot.ServerName,
                  )
                  expect(revalidatedSlot.CharacterClassName).toBe(
                    originalSlot.CharacterClassName,
                  )
                  expect(revalidatedSlot.ExpeditionIndex).toBe(
                    originalSlot.ExpeditionIndex,
                  )
                }
              } else {
                // 최소 아이템 레벨을 충족하지 않는 캐릭터는 지워져야 함 (유효하지 않은 선택)
                expect(revalidatedSlot).toBeNull()
              }
            }
          }

          // 재검증 과정에서 유효한 선택만 유지되어야 함
          const validSlotsCount = existingSlots.filter(
            (slot) =>
              slot !== null && (slot.ItemLevel ?? 0) >= selectedRaidMinLevel,
          ).length

          const retainedSlotsCount = revalidatedSlots.filter(
            (slot) => slot !== null,
          ).length

          expect(retainedSlotsCount).toBe(validSlotsCount)

          // 재검증 함수는 순수 함수여야 하므로 원본 배열을 변경하지 않아야 함
          expect(existingSlots).toHaveLength(4) // 원본 길이 유지

          // 재검증은 멱등성을 가져야 함 (같은 입력에 대해 같은 결과)
          const secondRevalidation = validateSlots(
            existingSlots,
            selectedRaidMinLevel,
          )
          expect(secondRevalidation).toEqual(revalidatedSlots)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('속성 9: 상태 직렬화 라운드트립', () => {
    // **Feature: raid-character-filtering, Property 9: State serialization round-trip**
    fc.assert(
      fc.property(raidNameGen, slotsGen, (selectedRaid, selectedSlots) => {
        // 상태를 직렬화한 후 역직렬화했을 때 원본과 동일해야 함
        const serialized = serializeRaidSetupState(selectedRaid, selectedSlots)
        const deserialized = deserializeRaidSetupState(serialized)

        // 직렬화가 성공했다면 (빈 문자열이 아님)
        if (serialized !== '') {
          expect(deserialized).not.toBeNull()

          if (deserialized !== null) {
            // 레이드 이름이 동일해야 함
            expect(deserialized.selectedRaid).toBe(selectedRaid)

            // 슬롯 배열 길이가 동일해야 함
            expect(deserialized.selectedSlots).toHaveLength(
              selectedSlots.length,
            )

            // 각 슬롯의 내용이 동일해야 함
            for (let i = 0; i < selectedSlots.length; i++) {
              const originalSlot = selectedSlots[i]
              const deserializedSlot = deserialized.selectedSlots[i]

              if (originalSlot === null) {
                expect(deserializedSlot).toBeNull()
              } else {
                expect(deserializedSlot).not.toBeNull()
                if (deserializedSlot !== null) {
                  expect(deserializedSlot.CharacterName).toBe(
                    originalSlot.CharacterName,
                  )
                  expect(deserializedSlot.ItemLevel).toBe(
                    originalSlot.ItemLevel,
                  )
                  expect(deserializedSlot.ServerName).toBe(
                    originalSlot.ServerName,
                  )
                  expect(deserializedSlot.CharacterClassName).toBe(
                    originalSlot.CharacterClassName,
                  )
                  expect(deserializedSlot.ExpeditionIndex).toBe(
                    originalSlot.ExpeditionIndex,
                  )
                }
              }
            }

            // 타임스탬프가 존재해야 함 (정확한 값은 검증하지 않음, 직렬화 시점에 생성되므로)
            expect(typeof deserialized.timestamp).toBe('number')
            expect(deserialized.timestamp).toBeGreaterThan(0)
          }
        }
      }),
      { numRuns: 100 },
    )
  })
})
