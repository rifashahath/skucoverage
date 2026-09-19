PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  store_url TEXT NOT NULL,
  subscription_plan TEXT NOT NULL DEFAULT 'free' CHECK(subscription_plan IN ('free', '19', '39')),
  created_at TEXT NOT NULL
);

-- Note: If production D1 already has duplicate emails, dedupe first: keep the oldest row per lower(email).
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users(LOWER(email));

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK(plan IN ('19', '39')),
  stripe_token_last4 TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  store_url TEXT NOT NULL,
  audit_data TEXT,
  score REAL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'error')),
  csv_key TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS audits_user_id_idx ON audits(user_id);

CREATE TABLE IF NOT EXISTS scan_rate_limits (
  ip TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL
);

-- Added during the production-readiness pass.
-- audits were queried by (user_id, created_at) for history and for the rolling
-- 24h quota count, but only user_id was indexed, so every quota check scanned
-- the user's whole audit history.
CREATE INDEX IF NOT EXISTS audits_user_created_idx ON audits(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audits_status_idx ON audits(status);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
-- Expired rate-limit rows are deleted by window_start on every anonymous scan.
CREATE INDEX IF NOT EXISTS scan_rate_limits_window_idx ON scan_rate_limits(window_start);
