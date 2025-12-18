# 기술 스택 & 빌드 시스템

## 핵심 기술

- **프론트엔드**: React 19.2.0 with TypeScript
- **빌드 도구**: Vite 7.1.7 with ES modules
- **라우팅**: TanStack Router (코드 기반 라우팅)
- **스타일링**: Tailwind CSS 4.0.6
- **데이터베이스**: Supabase (실시간 구독 기능을 갖춘 PostgreSQL)
- **UI 컴포넌트**: Radix UI primitives, Lucide React icons
- **알림**: Sonner for toast messages

## 개발 도구

- **패키지 매니저**: pnpm (권장), npm 대체
- **린팅**: ESLint with TanStack config
- **포매팅**: Prettier
- **테스팅**: Vitest with jsdom, React Testing Library
- **개발 도구**: TanStack Router DevTools, TanStack DevTools

## 주요 명령어

```bash
# 개발
pnpm dev              # 포트 3000에서 개발 서버 시작
pnpm build            # 프로덕션 빌드 (TypeScript 체크 포함)
pnpm preview          # 프로덕션 빌드 미리보기

# 코드 품질
pnpm lint             # ESLint 실행
pnpm format           # Prettier 실행
pnpm check            # 포매팅 + 린팅 자동 수정

# 테스팅
pnpm test             # Vitest로 테스트 실행
```

## 환경 설정

- `.env.example`을 `.env.local`로 복사
- Supabase 대시보드에서 `VITE_SUPABASE_ANON_KEY` 추가
- Supabase URL: `https://lqouhidmuczumzrkpphc.supabase.co`

## 주요 설정

- TypeScript strict mode 활성화
- 경로 별칭: `@/*`는 `./src/*`에 매핑
- 개발 및 미리보기 모두 포트 3000 (strict)
- ES2022 타겟과 bundler 모듈 해석
