# 개인 메뉴 타입 오류 빠른 수정

메뉴 생성 시 "personal" 타입 오류가 발생하는 경우 다음 방법으로 해결할 수 있습니다.

## 🚨 오류 내용
```
code: "23514"
message: "new row for relation \"custom_menus\" violates check constraint \"custom_menus_type_check\""
```

## ⚡ 빠른 수정 방법

### 방법 1: Supabase 대시보드에서 직접 실행 (권장)

1. [Supabase 대시보드](https://supabase.com/dashboard/project/lqouhidmuczumzrkpphc/sql/new) 접속
2. SQL Editor로 이동
3. 다음 SQL을 복사하여 실행:

```sql
-- 기존 CHECK 제약 조건 제거
ALTER TABLE custom_menus DROP CONSTRAINT IF EXISTS custom_menus_type_check;

-- 새로운 CHECK 제약 조건 추가 (personal 타입 포함)
ALTER TABLE custom_menus ADD CONSTRAINT custom_menus_type_check 
CHECK (type IN ('group', 'personal', 'dashboard', 'external_link', 'custom_page', 'project'));
```

4. "Run" 버튼 클릭하여 실행

### 방법 2: 마이그레이션 스크립트 사용

```bash
# 터미널에서 실행
pnpm migrate:menu-type
```

### 방법 3: 수동 마이그레이션 파일 실행

```bash
# ts-node가 설치되어 있다면
ts-node scripts/apply-menu-type-migration.ts
```

## ✅ 수정 확인

수정이 완료되면 다음 SQL로 확인할 수 있습니다:

```sql
-- 제약 조건 확인
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'custom_menus_type_check';
```

결과에서 `'personal'`이 포함되어 있으면 성공입니다.

## 🎯 이후 작업

수정 완료 후:
1. 브라우저 새로고침
2. "새 메뉴 추가" 다시 시도
3. 개인 페이지 메뉴 생성 테스트

## 🔍 문제 원인

기존 데이터베이스 스키마에서 `custom_menus` 테이블의 `type` 컬럼이 다음 값들만 허용하도록 설정되어 있었습니다:
- 'group'
- 'dashboard' 
- 'external_link'
- 'custom_page'
- 'project'

새로 추가된 'personal' 타입이 제약 조건에 포함되지 않아 오류가 발생했습니다.

## 📋 향후 예방

새로운 메뉴 타입을 추가할 때는 항상 데이터베이스 제약 조건도 함께 업데이트해야 합니다.