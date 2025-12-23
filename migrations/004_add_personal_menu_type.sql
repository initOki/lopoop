-- 개인 메뉴 타입을 custom_menus 테이블에 추가하는 마이그레이션

-- 기존 CHECK 제약 조건 제거
ALTER TABLE custom_menus DROP CONSTRAINT IF EXISTS custom_menus_type_check;

-- 새로운 CHECK 제약 조건 추가 (personal 타입 포함)
ALTER TABLE custom_menus ADD CONSTRAINT custom_menus_type_check 
CHECK (type IN ('group', 'personal', 'dashboard', 'external_link', 'custom_page', 'project'));

-- 확인용 쿼리 (실행 후 결과 확인)
-- SELECT conname, consrc FROM pg_constraint WHERE conname = 'custom_menus_type_check';