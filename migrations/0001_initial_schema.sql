PRAGMA foreign_keys = ON;

CREATE TABLE instagram_connection (
  singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
  account_id TEXT NOT NULL,
  username TEXT NOT NULL,
  token_ciphertext TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  token_expires_at TEXT,
  permissions_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('connected', 'action_required', 'disconnected')),
  webhook_subscribed INTEGER NOT NULL DEFAULT 0 CHECK (webhook_subscribed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  media_id TEXT NOT NULL UNIQUE,
  media_permalink TEXT,
  match_mode TEXT NOT NULL CHECK (match_mode IN ('contains', 'exact')),
  initial_message TEXT NOT NULL,
  initial_button_text TEXT NOT NULL,
  follow_message TEXT NOT NULL,
  recheck_button_text TEXT NOT NULL,
  delivery_message TEXT NOT NULL,
  unavailable_message TEXT NOT NULL,
  material_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused')),
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaign_keywords (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (campaign_id, normalized_value)
);

CREATE TABLE deliveries (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
  campaign_revision INTEGER NOT NULL,
  comment_id TEXT NOT NULL,
  recipient_id TEXT,
  last_action_event_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('received', 'initial_dm_sent', 'waiting_for_follow', 'delivered', 'failed', 'unknown')),
  initial_message TEXT NOT NULL,
  initial_button_text TEXT NOT NULL,
  follow_message TEXT NOT NULL,
  recheck_button_text TEXT NOT NULL,
  delivery_message TEXT NOT NULL,
  unavailable_message TEXT NOT NULL,
  material_url TEXT NOT NULL,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at TEXT,
  UNIQUE (campaign_id, comment_id)
);

CREATE INDEX deliveries_created_at_idx ON deliveries(created_at DESC);
CREATE INDEX deliveries_status_idx ON deliveries(status, created_at DESC);
