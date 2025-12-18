# 설계 문서

## 개요

이 기능은 최소 아이템 레벨 요구사항에 따라 레이드 설정 시스템에 자동 캐릭터 필터링을 추가합니다. 설계는 사용 가능한 캐릭터를 실시간으로 필터링하는 레이드 선택 메커니즘을 도입하여 사용자가 레이드의 최소 아이템 레벨 요구사항을 충족하는 캐릭터만 선택할 수 있도록 합니다. 구현은 기존 `RaidSetup` 컴포넌트를 수정하여 선택적 레이드 선택 prop을 받아들이고, 선택한 레이드의 요구사항에 따라 캐릭터를 필터링하도록 `RaidSlot` 컴포넌트를 향상시킵니다.

핵심 설계 원칙은 새로운 필터링 기능을 추가하면서 기존 사용법과의 하위 호환성을 유지하는 것입니다. `RaidSetup` 컴포넌트는 레이드 선택 없이도 사용 가능하지만(모든 캐릭터 표시), 레이드가 선택되면 모든 슬롯에서 캐릭터를 자동으로 필터링합니다.

## 아키텍처

### 컴포넌트 계층 구조

```
RaidSetup (향상됨)
├── 레이드 선택 드롭다운 (신규)
├── 계정 검색 그리드 (기존)
│   └── AccountSearch × 4
└── 레이드 슬롯 그리드 (기존)
    └── RaidSlot × 4 (필터링 기능 추가)
```

### 데이터 흐름

1. **레이드 선택**: 사용자가 `RaidSetup`의 드롭다운에서 레이드를 선택
2. **상태 업데이트**: 선택된 레이드 정보(이름, 최소 아이템 레벨)가 컴포넌트 상태에 저장됨
3. **Prop 전파**: 최소 아이템 레벨이 각 `RaidSlot` 컴포넌트로 전달됨
4. **캐릭터 필터링**: 각 `RaidSlot`이 최소 아이템 레벨에 따라 캐릭터 목록을 필터링
5. **선택 검증**: 레이드가 변경되면 기존 선택이 검증되고 유효하지 않으면 지워짐

### 통합 지점

- **SchedulePage**: 레이드 선택 상태를 `RaidSetup` 컴포넌트로 전달
- **RaidList**: 기존 `raidList` 배열이 레이드 정보를 제공
- **Character Data**: 기존 `ExpeditionCharacter` 타입이 아이템 레벨 정보를 제공

## 컴포넌트 및 인터페이스

### 향상된 RaidSetup 컴포넌트

**새로운 Props:**

```typescript
type Props = {
  selectedSlots?: (ExpeditionCharacter | null)[]
  onSlotsChange?: (slots: (ExpeditionCharacter | null)[]) => void
  selectedRaid?: string // 신규: 레이드 이름
  onRaidChange?: (raidName: string) => void // 신규: 레이드 선택 콜백
}
```

**새로운 State:**

```typescript
const [internalRaid, setInternalRaid] = useState<string>('')
```

**동작:**

- 제어 및 비제어 레이드 선택을 모두 지원 (기존 슬롯 관리와 유사)
- 레이드가 변경되면 현재 모든 슬롯 선택을 검증
- 새로운 최소 아이템 레벨 요구사항을 더 이상 충족하지 않는 슬롯을 지움
- 레이드가 선택되면 레이드 정보를 눈에 띄게 표시

### 향상된 RaidSlot 컴포넌트

**새로운 Props:**

```typescript
type Props = {
  index: number
  characters: ExpeditionCharacter[]
  value: ExpeditionCharacter | null
  onChange: (c: ExpeditionCharacter | null) => void
  minItemLevel?: number // 신규: 최소 아이템 레벨 필터
}
```

**필터링 로직:**

```typescript
const filteredCharacters =
  minItemLevel !== undefined
    ? characters.filter((c) => c.ItemLevel >= minItemLevel)
    : characters

const sortedCharacters = [...filteredCharacters].sort(
  (a, b) => b.ItemLevel - a.ItemLevel,
)
```

**UI 개선사항:**

- 요구사항을 충족하는 캐릭터가 없을 때 플레이스홀더 메시지 표시
- 기존 정렬 순서 유지 (아이템 레벨 내림차순)
- 캐릭터 수 정보 표시

### 레이드 선택 UI 컴포넌트

**위치:** `RaidSetup` 컴포넌트 내부, 계정 검색 그리드 위

**구조:**

```typescript
<div className="mb-6">
  <label className="block text-sm font-medium text-gray-300 mb-2">
    레이드 선택
  </label>
  <select
    value={selectedRaid}
    onChange={handleRaidChange}
    className="w-full max-w-md rounded bg-zinc-800 px-3 py-2 text-white border border-gray-600"
  >
    <option value="">레이드 선택 안함 (모든 캐릭터 표시)</option>
    {raidList.map(raid => (
      <option key={raid.name} value={raid.name}>
        {raid.name} (입장 {raid.minItemLevel})
      </option>
    ))}
  </select>
  {selectedRaidInfo && (
    <p className="mt-2 text-sm text-gray-400">
      최소 아이템 레벨: {selectedRaidInfo.minItemLevel}
    </p>
  )}
</div>
```

## 데이터 모델

### 기존 타입 (변경 없음)

```typescript
type ExpeditionCharacter = {
  CharacterName: string
  ItemLevel: number
  ServerName: string
  CharacterClassName: string
  ExpeditionIndex: number
}

type RaidInfo = {
  name: string
  minItemLevel: number
}
```

### 새로운 헬퍼 타입

```typescript
type RaidSelectionState = {
  raidName: string
  minItemLevel: number
} | null

type SerializableRaidSetupState = {
  selectedRaid: string
  selectedSlots: (ExpeditionCharacter | null)[]
  timestamp: number
}
```

## 데이터 구조

### 캐릭터 필터링 알고리즘

**입력:**

- `characters: ExpeditionCharacter[]` - 원정대의 모든 캐릭터
- `minItemLevel: number | undefined` - 최소 아이템 레벨 요구사항

**출력:**

- `ExpeditionCharacter[]` - 필터링되고 정렬된 캐릭터

**알고리즘:**

```typescript
function filterAndSortCharacters(
  characters: ExpeditionCharacter[],
  minItemLevel?: number,
): ExpeditionCharacter[] {
  // 1단계: 지정된 경우 최소 아이템 레벨로 필터링
  const filtered =
    minItemLevel !== undefined
      ? characters.filter((c) => c.ItemLevel >= minItemLevel)
      : characters

  // 2단계: 아이템 레벨 내림차순으로 정렬
  return [...filtered].sort((a, b) => b.ItemLevel - a.ItemLevel)
}
```

### 슬롯 검증 알고리즘

**입력:**

- `slots: (ExpeditionCharacter | null)[]` - 현재 슬롯 선택
- `newMinItemLevel: number` - 새로운 최소 아이템 레벨 요구사항

**출력:**

- `(ExpeditionCharacter | null)[]` - 유효하지 않은 선택이 지워진 검증된 슬롯

**알고리즘:**

```typescript
function validateSlots(
  slots: (ExpeditionCharacter | null)[],
  newMinItemLevel: number,
): (ExpeditionCharacter | null)[] {
  return slots.map((slot) => {
    if (slot === null) return null
    return slot.ItemLevel >= newMinItemLevel ? slot : null
  })
}
```

### 상태 직렬화 알고리즘

**입력:**

- `selectedRaid: string` - 선택된 레이드 이름
- `selectedSlots: (ExpeditionCharacter | null)[]` - 현재 슬롯 선택

**출력:**

- `string` - JSON 직렬화된 상태

**알고리즘:**

```typescript
function serializeRaidSetupState(
  selectedRaid: string,
  selectedSlots: (ExpeditionCharacter | null)[],
): string {
  const state: SerializableRaidSetupState = {
    selectedRaid,
    selectedSlots,
    timestamp: Date.now(),
  }
  return JSON.stringify(state)
}
```

### 상태 역직렬화 알고리즘

**입력:**

- `serializedState: string` - JSON 직렬화된 상태

**출력:**

- `SerializableRaidSetupState | null` - 역직렬화된 상태 또는 실패 시 null

**알고리즘:**

```typescript
function deserializeRaidSetupState(
  serializedState: string,
): SerializableRaidSetupState | null {
  try {
    const parsed = JSON.parse(serializedState)

    // 기본 구조 검증
    if (
      typeof parsed.selectedRaid !== 'string' ||
      !Array.isArray(parsed.selectedSlots) ||
      typeof parsed.timestamp !== 'number'
    ) {
      return null
    }

    return parsed as SerializableRaidSetupState
  } catch {
    return null
  }
}
```

## 정확성 속성

_속성은 시스템의 모든 유효한 실행에서 참이어야 하는 특성 또는 동작입니다. 본질적으로 시스템이 수행해야 하는 작업에 대한 공식적인 명세입니다. 속성은 사람이 읽을 수 있는 명세와 기계가 검증할 수 있는 정확성 보장 사이의 다리 역할을 합니다._

### 속성 1: 레이드 선택 상태 저장

_모든_ 레이드 목록에서 선택된 레이드에 대해, 시스템 상태는 레이드 이름과 해당 최소 아이템 레벨 요구사항을 모두 포함해야 합니다.

**검증: 요구사항 1.2**

### 속성 2: 레이드 변경 시 필터링 업데이트

_모든_ 레이드 변경(한 레이드에서 다른 레이드로 변경하거나 레이드 없음에서 레이드로 변경하는 것 포함)에 대해, 모든 레이드 슬롯은 새로운 최소 아이템 레벨에 따라 업데이트된 캐릭터 필터링을 즉시 반영해야 합니다.

**검증: 요구사항 1.3**

### 속성 3: 캐릭터 필터링 정확성

_모든_ 최소 아이템 레벨 M을 가진 레이드와 모든 캐릭터 세트에 대해, 필터링된 캐릭터 목록은 ItemLevel >= M인 캐릭터만 포함해야 합니다.

**검증: 요구사항 2.1, 2.2**

### 속성 4: 정렬 순서 유지

_모든_ 캐릭터 필터링 작업에 대해, 결과 필터링된 목록은 ItemLevel에 따른 내림차순 정렬 순서를 유지해야 합니다(즉, 목록의 인접한 두 캐릭터에 대해 첫 번째는 두 번째보다 ItemLevel이 크거나 같아야 함).

**검증: 요구사항 2.4**

### 속성 5: 유효한 선택 유지

_모든_ 레이드 A(minLevel = X)에서 레이드 B(minLevel = Y)로의 레이드 변경에 대해, 캐릭터 C가 슬롯에 선택되어 있고 C.ItemLevel >= Y이면, 레이드 변경 후에도 C는 해당 슬롯에 선택된 상태로 유지되어야 합니다.

**검증: 요구사항 4.1**

### 속성 6: 유효하지 않은 선택 지우기

_모든_ 레이드 A(minLevel = X)에서 레이드 B(minLevel = Y)로의 레이드 변경에 대해, 캐릭터 C가 슬롯에 선택되어 있고 C.ItemLevel < Y이면, 레이드 변경 후 해당 슬롯은 지워져야 합니다(null로 설정).

**검증: 요구사항 4.2, 4.3**

### 속성 7: 동적 캐릭터 필터링

_모든_ 최소 아이템 레벨 M을 가진 레이드에 대해, 새로운 캐릭터가 원정대에 로드될 때, 해당 레이드 슬롯은 ItemLevel >= M인 캐릭터만 표시해야 합니다.

**검증: 요구사항 5.1, 5.2**

### 속성 8: 슬롯 재검증

_모든_ 계정 검색 완료 후 레이드가 선택되어 있는 상황에 대해, 기존 슬롯 선택은 새로운 최소 아이템 레벨 요구사항에 대해 재검증되어야 하며, 유효하지 않은 선택은 지워져야 합니다.

**검증: 요구사항 5.4**

### 속성 9: 상태 직렬화 라운드트립

_모든_ 유효한 레이드 설정 상태에 대해, JSON으로 직렬화한 후 역직렬화하면 원래 상태와 동등한 상태가 복원되어야 합니다.

**검증: 요구사항 6.1, 6.2**

## 오류 처리

### 유효하지 않은 레이드 선택

**시나리오:** 사용자가 레이드 목록에 존재하지 않는 레이드를 선택하는 경우 (엣지 케이스, 정상적인 UI 흐름에서는 발생하지 않아야 함)

**처리:**

- "레이드 선택 안함" 상태로 처리
- 필터링 없이 모든 캐릭터 표시
- 디버깅을 위해 콘솔에 경고 로그 기록

### 아이템 레벨 데이터 누락

**시나리오:** 캐릭터 객체에 ItemLevel 속성이 없거나 유효하지 않은 값을 가진 경우

**처리:**

- 캐릭터를 ItemLevel 0으로 처리
- 레이드가 선택되면 캐릭터가 필터링됨
- 캐릭터 이름과 함께 콘솔에 경고 로그 기록

### 동시 상태 업데이트

**시나리오:** 캐릭터 데이터가 로드되는 동안 사용자가 레이드 선택을 빠르게 변경하는 경우

**처리:**

- React의 상태 배칭을 사용하여 일관된 상태 보장
- 항상 가장 최근의 레이드 선택 적용
- 필터링 로직은 순수하고 멱등성이 있으므로 여러 번 적용해도 안전

### 빈 캐릭터 목록

**시나리오:** 슬롯에 대해 최소 아이템 레벨 요구사항을 충족하는 캐릭터가 없는 경우

**처리:**

- 플레이스홀더 메시지와 함께 빈 드롭다운 표시: "입장 가능한 캐릭터가 없습니다"
- 사용자가 레이드 선택을 지워서 모든 캐릭터를 볼 수 있도록 허용
- 오류를 발생시키거나 UI를 중단하지 않음

### 직렬화 오류

**시나리오:** JSON 직렬화 또는 역직렬화 중 오류가 발생하는 경우

**처리:**

- 직렬화 실패 시 콘솔에 경고 로그 기록하고 빈 문자열 반환
- 역직렬화 실패 시 null 반환하여 기본 상태 사용
- 손상된 데이터로 인한 애플리케이션 크래시 방지
- 사용자에게 오류 메시지 표시하지 않고 우아하게 처리

### 상태 복원 실패

**시나리오:** 저장된 상태가 현재 레이드 목록과 호환되지 않는 경우

**처리:**

- 존재하지 않는 레이드 이름은 "레이드 선택 안함"으로 처리
- 유효하지 않은 캐릭터 데이터는 무시하고 빈 슬롯으로 설정
- 부분적으로 유효한 데이터는 가능한 한 복원
- 완전히 유효하지 않은 상태는 기본 상태로 대체

## 테스트 전략

### 단위 테스트

테스트 접근 방식은 프로젝트에 이미 구성된 **Vitest**를 테스트 프레임워크로 사용합니다.

**테스트 파일:**

- `src/features/raidSetup/RaidSetup.test.tsx` - 컴포넌트 통합 테스트
- `src/features/raidSetup/RaidSlot.test.tsx` - 슬롯 필터링 테스트
- `src/features/raidSetup/filterUtils.test.ts` - 필터링 로직을 위한 순수 함수 테스트

**주요 단위 테스트:**

1. **레이드 선택 UI 테스트:**
   - 레이드 드롭다운이 레이드 목록의 모든 레이드와 함께 렌더링됨
   - 레이드 선택 시 컴포넌트 상태 업데이트
   - 선택 시 레이드 정보가 올바르게 표시됨

2. **캐릭터 필터링 테스트:**
   - 최소 레벨 미만의 캐릭터는 제외됨
   - 최소 레벨 이상의 캐릭터는 포함됨
   - 빈 목록이 플레이스홀더와 함께 우아하게 처리됨

3. **슬롯 검증 테스트:**
   - 레이드 변경 시 유효한 선택이 유지됨
   - 레이드 변경 시 유효하지 않은 선택이 지워짐
   - 여러 슬롯이 동시에 검증됨

4. **통합 테스트:**
   - 새로 로드된 캐릭터가 올바르게 필터링됨
   - 레이드 변경이 모든 슬롯에서 필터링을 트리거함
   - 레이드가 선택되지 않으면 모든 캐릭터가 표시됨

### 속성 기반 테스트

테스트 접근 방식은 TypeScript/JavaScript용 속성 기반 테스트 라이브러리로 **fast-check**를 사용합니다.

**설치:**

```bash
npm install --save-dev fast-check
```

**생성기 전략:**

1. **캐릭터 생성기:**

```typescript
const characterGen = fc.record({
  CharacterName: fc.string({ minLength: 1, maxLength: 20 }),
  ItemLevel: fc.integer({ min: 1000, max: 2000 }),
  ServerName: fc.constantFrom('루페온', '실리안', '아만'),
  CharacterClassName: fc.constantFrom('바드', '버서커', '소서리스'),
  ExpeditionIndex: fc.integer({ min: 1, max: 4 }),
})
```

2. **레이드 생성기:**

```typescript
const raidGen = fc.record({
  name: fc.string({ minLength: 1 }),
  minItemLevel: fc.integer({ min: 1500, max: 1800 }),
})
```

3. **슬롯 배열 생성기:**

```typescript
const slotsGen = fc.array(fc.option(characterGen, { nil: null }), {
  minLength: 4,
  maxLength: 4,
})
```

**속성 테스트 구성:**

- 각 속성 테스트는 최소 100회 반복 실행해야 함
- 실패한 케이스 디버깅을 위해 시드 기반 재생 사용
- 각 테스트에 설계 문서의 속성 번호로 태그 지정

**속성 테스트 구현:**

각 정확성 속성은 단일 속성 기반 테스트로 구현됩니다:

1. **속성 1 테스트:** 무작위 레이드 생성, 선택, 상태에 올바른 이름과 minItemLevel이 포함되어 있는지 확인
2. **속성 2 테스트:** 무작위 레이드 변경 생성, 모든 슬롯이 필터링을 업데이트하는지 확인
3. **속성 3 테스트:** 무작위 레이드 및 캐릭터 세트 생성, 필터링된 목록의 정확성 확인
4. **속성 4 테스트:** 무작위 캐릭터 세트 및 필터 생성, 정렬 순서가 유지되는지 확인
5. **속성 5 테스트:** 무작위 레이드 변경 및 유효한 캐릭터 생성, 유지 확인
6. **속성 6 테스트:** 무작위 레이드 변경 및 유효하지 않은 캐릭터 생성, 지우기 확인
7. **속성 7 테스트:** 무작위 레이드 및 캐릭터 로드 생성, 필터링 적용 확인

**테스트 파일 구조:**

```typescript
// src/features/raidSetup/RaidSetup.properties.test.ts
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('레이드 캐릭터 필터링 속성', () => {
  it('속성 1: 레이드 선택 상태 저장', () => {
    // **Feature: raid-character-filtering, Property 1: Raid selection state storage**
    fc.assert(
      fc.property(raidGen, (raid) => {
        // 테스트 구현
      }),
      { numRuns: 100 },
    )
  })

  // ... 추가 속성 테스트
})
```

### 테스트 모범 사례

1. **격리:** 각 테스트는 독립적이어야 하며 공유 상태에 의존하지 않아야 함
2. **명확성:** 테스트 이름은 테스트 중인 속성 또는 동작을 명확하게 나타내야 함
3. **커버리지:** 필터링 로직 및 상태 관리의 100% 커버리지를 목표로 함
4. **성능:** 속성 테스트는 합리적인 시간 내에 완료되어야 함 (속성당 < 5초)
5. **디버깅:** fc.sample()을 사용하여 수동 테스트를 위한 예제 입력 생성
6. **엣지 케이스:** 요구사항에서 식별된 엣지 케이스를 명시적으로 테스트 (빈 목록, 레이드 선택 안함)

## 구현 참고사항

### 성능 고려사항

- 필터링은 O(n)이며, 여기서 n은 원정대당 캐릭터 수 (일반적으로 < 20)
- 정렬은 O(n log n)이지만 필터링된 결과에만 적용됨
- 일반적인 데이터 크기에서는 성능 문제가 예상되지 않음
- 큰 캐릭터 목록에서 성능 문제가 발생하면 메모이제이션 고려

### 하위 호환성

- 레이드 선택 props 없이 기존 `RaidSetup` 사용은 변경 없이 계속 작동
- 새로운 props는 선택 사항이며 기존 API 유지
- `SchedulePage`는 기능을 점진적으로 채택 가능

### 향후 개선사항

- 최소 레벨에 가깝지만 미달하는 캐릭터에 대한 시각적 표시 추가
- 다중 레이드 선택 지원 (여러 레이드 동시 계획)
- 캐릭터 가용성 추적 (다른 레이드에서 이미 사용된 캐릭터 표시)
- 빠른 설정을 위한 저장된 레이드 구성
