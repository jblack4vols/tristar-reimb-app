CREATE TABLE IF NOT EXISTS rate_changes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  payer TEXT NOT NULL,
  old_amount NUMERIC(10,2),
  new_amount NUMERIC(10,2) NOT NULL,
  changed_by TEXT NOT NULL DEFAULT '',
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_changes_code ON rate_changes (code, changed_at DESC);
ALTER TABLE rate_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on rate_changes" ON rate_changes FOR ALL USING (true) WITH CHECK (true);
