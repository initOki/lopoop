-- Global raid schedule reset tracking
CREATE TABLE IF NOT EXISTS raid_schedule_resets (
    key TEXT PRIMARY KEY,
    last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_raid_schedule_resets_updated_at
    BEFORE UPDATE ON raid_schedule_resets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
