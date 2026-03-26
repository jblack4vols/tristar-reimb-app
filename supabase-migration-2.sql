-- ═══════════════════════════════════════════════════════════
-- Tristar PT — Migration #2: Users, Combos, Activity Log
-- Run this in Supabase SQL Editor after migration #1
-- ═══════════════════════════════════════════════════════════

-- ── Users ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  username   TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  email      TEXT DEFAULT '',
  location   TEXT DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'staff',
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Saved Combos ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS combos (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  codes      TEXT[] NOT NULL DEFAULT '{}',
  payer      TEXT DEFAULT '',
  provider   TEXT DEFAULT '',
  owner      TEXT DEFAULT '',
  owner_id   TEXT DEFAULT '',
  saved_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Activity Log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id         SERIAL PRIMARY KEY,
  username   TEXT NOT NULL,
  action     TEXT NOT NULL,
  detail     TEXT DEFAULT '',
  ts         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast log queries
CREATE INDEX IF NOT EXISTS idx_activity_log_ts ON activity_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log (username);

-- ── Row Level Security ──────────────────────────────────
ALTER TABLE app_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on app_users"    ON app_users    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on combos"       ON combos       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on activity_log" ON activity_log  FOR ALL USING (true) WITH CHECK (true);
