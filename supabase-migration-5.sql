-- ═══════════════════════════════════════════════════════════
-- Tristar PT — Migration #5: Billing Visit Log
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS billing_entries (
  id           SERIAL PRIMARY KEY,
  patient_name TEXT NOT NULL,
  codes        TEXT[] NOT NULL DEFAULT '{}',
  payer        TEXT NOT NULL DEFAULT '',
  provider     TEXT NOT NULL DEFAULT '',
  location     TEXT NOT NULL DEFAULT '',
  total        NUMERIC(10,2) NOT NULL DEFAULT 0,
  visit_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT DEFAULT '',
  entered_by   TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_entries_date ON billing_entries (visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_billing_entries_user ON billing_entries (entered_by);
CREATE INDEX IF NOT EXISTS idx_billing_entries_patient ON billing_entries (patient_name);

ALTER TABLE billing_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on billing_entries" ON billing_entries FOR ALL USING (true) WITH CHECK (true);
