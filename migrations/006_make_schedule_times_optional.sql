-- 개인 스케줄의 시작 시간과 종료 시간을 선택사항으로 변경
ALTER TABLE personal_schedules 
ALTER COLUMN start_time DROP NOT NULL,
ALTER COLUMN end_time DROP NOT NULL;