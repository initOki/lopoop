-- 실시간 기능 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE personal_debts;
ALTER PUBLICATION supabase_realtime ADD TABLE personal_schedules;

-- RLS (Row Level Security) 활성화
ALTER TABLE personal_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_schedules ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성 (모든 사용자가 자신의 데이터만 접근 가능)
CREATE POLICY "Users can view their own personal debts" ON personal_debts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own personal debts" ON personal_debts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own personal debts" ON personal_debts
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own personal debts" ON personal_debts
    FOR DELETE USING (true);

CREATE POLICY "Users can view their own personal schedules" ON personal_schedules
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own personal schedules" ON personal_schedules
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own personal schedules" ON personal_schedules
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own personal schedules" ON personal_schedules
    FOR DELETE USING (true);