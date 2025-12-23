-- Remove start_time and end_time columns from personal_schedules table
ALTER TABLE personal_schedules 
DROP COLUMN IF EXISTS start_time,
DROP COLUMN IF EXISTS end_time;