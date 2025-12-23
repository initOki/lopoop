-- 개인 빚 관리 테이블 생성
CREATE TABLE IF NOT EXISTS personal_debts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    debtor TEXT NOT NULL,
    creditor TEXT NOT NULL,
    amount DECIMAL(10,2),
    item TEXT,
    description TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 개인 스케줄 관리 테이블 생성
CREATE TABLE IF NOT EXISTS personal_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL DEFAULT 'personal' CHECK (type IN ('raid', 'meeting', 'event', 'personal')),
    participants TEXT[] DEFAULT '{}',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_personal_debts_user_id ON personal_debts(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_debts_created_at ON personal_debts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_debts_is_paid ON personal_debts(is_paid);

CREATE INDEX IF NOT EXISTS idx_personal_schedules_user_id ON personal_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_schedules_start_time ON personal_schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_personal_schedules_type ON personal_schedules(type);
CREATE INDEX IF NOT EXISTS idx_personal_schedules_is_completed ON personal_schedules(is_completed);

-- 업데이트 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 업데이트 트리거 설정
CREATE TRIGGER update_personal_debts_updated_at 
    BEFORE UPDATE ON personal_debts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personal_schedules_updated_at 
    BEFORE UPDATE ON personal_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();