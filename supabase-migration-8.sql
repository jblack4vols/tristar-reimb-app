-- ═══════════════════════════════════════════════════════════
-- Tristar PT — Migration #8: Feature Requests
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS feature_requests (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  submitted_by TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'new',
  votes       INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on feature_requests" ON feature_requests FOR ALL USING (true) WITH CHECK (true);
