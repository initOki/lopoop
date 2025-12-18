# 프로젝트 구조 & 조직

## 디렉토리 구조

```
src/
├── components/          # 재사용 가능한 UI 컴포넌트
│   ├── ui/             # 기본 UI 컴포넌트 (Radix 기반)
│   ├── Header.tsx      # 사이드바가 있는 네비게이션 헤더
│   ├── DebtPage.tsx    # 빚 관리 페이지
│   └── SchedulePage.tsx # 레이드 스케줄링 페이지
├── features/           # 기능별 모듈
│   ├── characterSearch/ # 로스트아크 캐릭터 조회
│   └── raidSetup/      # 레이드 파티 구성
├── lib/                # 공유 유틸리티 및 설정
│   ├── supabase.ts     # 데이터베이스 클라이언트 설정
│   ├── utils.ts        # 일반 유틸리티
│   └── raid-list.ts    # 레이드 정의
├── pages/              # 페이지 컴포넌트
├── styles/             # 글로벌 스타일 및 Tailwind
├── types/              # TypeScript 타입 정의
│   ├── database.ts     # Supabase 스키마 타입
│   ├── debt.ts         # 빚 관련 타입
│   └── loa.ts          # 로스트아크 API 타입
├── utils/              # 헬퍼 함수
└── main.tsx           # 라우팅이 포함된 앱 진입점
```

## 아키텍처 패턴

### 라우팅

- `main.tsx`에서 TanStack Router를 사용한 **코드 기반 라우팅**
- 라우트: `/` (홈), `/schedule`, `/debts`
- 루트 레이아웃에 Header 및 Toaster 컴포넌트 포함

### 데이터 관리

- `src/lib/supabase.ts`의 **Supabase 클라이언트**
- 실시간 업데이트를 위한 **실시간 구독**
- 생성된 타입을 사용한 **타입 안전 데이터베이스** 작업

### 컴포넌트 조직

- 복잡한 기능을 위한 **기능 폴더**
- `/components`의 **공유 컴포넌트**
- `/components/ui`의 **UI 프리미티브**
- 라우팅과 레이아웃을 처리하는 **페이지 컴포넌트**

### 스타일링 규칙

- 커스텀 색상 스키마(gray-800/900 테마)를 갖춘 **Tailwind CSS**
- 모바일 우선 접근법의 **반응형 디자인**
- Tailwind 간격 스케일을 사용한 **일관된 간격**
- Lucide React **아이콘 사용** (Home, Menu, Wallet, Calendar 등)

### TypeScript 패턴

- 포괄적인 타입 체크가 활성화된 **Strict mode**
- Supabase 스키마에서 생성된 **데이터베이스 타입**
- 모든 데이터 모델에 대한 **인터페이스 정의**
- 데이터 변환을 위한 **유틸리티 타입 함수**

### 로스트아크 특화

- **캐릭터 데이터** 형식: "이름 / 직업 (아이템레벨)"
- `utils/classUtils.ts`의 **역할 분류** (서폿 vs 딜러)
- 전체 인터페이스에서 **한국어** 사용
- **4슬롯 레이드** 파티 구조
