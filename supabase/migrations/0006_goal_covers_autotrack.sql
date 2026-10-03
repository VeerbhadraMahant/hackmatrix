-- 0006_goal_covers_autotrack.sql
-- Add cover_key, funding_account_id, auto_track to goals table

ALTER TABLE goals ADD COLUMN IF NOT EXISTS cover_key TEXT DEFAULT 'general';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS funding_account_id TEXT;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS auto_track BOOLEAN DEFAULT FALSE;
