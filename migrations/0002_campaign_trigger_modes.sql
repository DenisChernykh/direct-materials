ALTER TABLE campaigns
ADD COLUMN trigger_mode TEXT NOT NULL DEFAULT 'specific'
CHECK (trigger_mode IN ('specific', 'any', 'next'));

ALTER TABLE campaigns
ADD COLUMN armed_at TEXT;

CREATE UNIQUE INDEX campaigns_one_active_any_idx
ON campaigns(trigger_mode)
WHERE trigger_mode = 'any' AND status = 'active';

CREATE UNIQUE INDEX campaigns_one_active_next_idx
ON campaigns(trigger_mode)
WHERE trigger_mode = 'next' AND status = 'active';
