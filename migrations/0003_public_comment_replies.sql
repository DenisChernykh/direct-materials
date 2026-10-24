ALTER TABLE campaigns
ADD COLUMN public_reply_enabled INTEGER NOT NULL DEFAULT 0
CHECK (public_reply_enabled IN (0, 1));

ALTER TABLE campaigns
ADD COLUMN public_reply_variants_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE deliveries
ADD COLUMN public_reply_text TEXT;

ALTER TABLE deliveries
ADD COLUMN public_reply_status TEXT NOT NULL DEFAULT 'disabled'
CHECK (public_reply_status IN ('disabled', 'pending', 'sent', 'failed', 'unknown'));

ALTER TABLE deliveries
ADD COLUMN public_reply_error_code TEXT;
