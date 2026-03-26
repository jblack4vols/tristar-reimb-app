-- ═══════════════════════════════════════════════════════════
-- Tristar PT — Migration #4: Email queue for welcome emails
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Email queue table — new user welcome emails are queued here.
-- A Supabase Edge Function or external service can poll this
-- table and send actual emails.
CREATE TABLE IF NOT EXISTS email_queue (
  id         SERIAL PRIMARY KEY,
  to_email   TEXT NOT NULL,
  to_name    TEXT NOT NULL DEFAULT '',
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue (status, created_at);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on email_queue" ON email_queue FOR ALL USING (true) WITH CHECK (true);
