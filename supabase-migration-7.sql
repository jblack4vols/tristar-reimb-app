-- ═══════════════════════════════════════════════════════════
-- Tristar PT — Migration #7: Patients, Authorizations, Templates
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── Patient Directory (PHI encrypted at app level) ──────
CREATE TABLE IF NOT EXISTS patients (
  id            SERIAL PRIMARY KEY,
  encrypted_name TEXT NOT NULL,
  payer         TEXT DEFAULT '',
  provider      TEXT DEFAULT '',
  location      TEXT DEFAULT '',
  diagnosis     TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_active ON patients (active, created_at DESC);
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on patients" ON patients FOR ALL USING (true) WITH CHECK (true);

-- ── Visit Authorizations ────────────────────────────────
CREATE TABLE IF NOT EXISTS authorizations (
  id              SERIAL PRIMARY KEY,
  patient_id      INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  payer           TEXT NOT NULL DEFAULT '',
  approved_visits INT NOT NULL DEFAULT 0,
  used_visits     INT NOT NULL DEFAULT 0,
  start_date      DATE,
  end_date        DATE,
  auth_number     TEXT DEFAULT '',
  notes           TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_patient ON authorizations (patient_id, status);
ALTER TABLE authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on authorizations" ON authorizations FOR ALL USING (true) WITH CHECK (true);

-- ── Treatment Plan Templates ────────────────────────────
CREATE TABLE IF NOT EXISTS treatment_templates (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  diagnosis   TEXT DEFAULT '',
  codes       TEXT[] NOT NULL DEFAULT '{}',
  description TEXT DEFAULT '',
  created_by  TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE treatment_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on treatment_templates" ON treatment_templates FOR ALL USING (true) WITH CHECK (true);

-- ── Seed some common treatment templates ────────────────
INSERT INTO treatment_templates (name, diagnosis, codes, description) VALUES
  ('Knee Replacement Post-Op', 'Total Knee Arthroplasty', '{"EVAL-63","TX","2TX","NR","MT","GT","ESM"}', 'Standard post-op TKA protocol'),
  ('Shoulder Repair Post-Op', 'Rotator Cuff Repair', '{"EVAL-63","TX","2TX","NR","2MT","ESM","VASO"}', 'Post-surgical shoulder rehab'),
  ('Low Back Pain', 'Lumbar Disc Herniation', '{"EVAL-62","TX","2TX","NR","MT","TRX","ESM"}', 'Conservative lumbar management'),
  ('Neck Pain / Cervicalgia', 'Cervical Radiculopathy', '{"EVAL-62","TX","NR","MT","2MT","TRX","ESM"}', 'Cervical spine protocol'),
  ('Ankle Sprain', 'Lateral Ankle Sprain', '{"EVAL-61","TX","NR","MT","ESM","SF"}', 'Acute ankle rehab'),
  ('Hip Replacement Post-Op', 'Total Hip Arthroplasty', '{"EVAL-63","TX","2TX","NR","MT","GT","2GT"}', 'Standard post-op THA protocol'),
  ('Stroke / CVA Rehab', 'Cerebrovascular Accident', '{"EVAL-63","TX","2TX","NR","2NR","GT","2GT","TA"}', 'Neuro rehab protocol'),
  ('Balance / Fall Prevention', 'Gait & Balance Disorder', '{"EVAL-62","TX","NR","GT","2GT","TA","PPT"}', 'Fall risk reduction'),
  ('Tennis Elbow', 'Lateral Epicondylitis', '{"EVAL-61","TX","NR","MT","IONTO","SE"}', 'Elbow tendinopathy protocol'),
  ('Dry Needling Visit', 'Myofascial Pain', '{"TX","MT","DN1","DN2"}', 'Dry needling focused session'),
  ('Aquatic Therapy Session', 'General Deconditioning', '{"AQ","AQ2","AQ3","TX"}', 'Pool-based therapy'),
  ('Wound Care Visit', 'Chronic Wound', '{"WC","WC2","TX","ESM"}', 'Wound management protocol'),
  ('OT Eval + Treatment', 'Upper Extremity Dysfunction', '{"EVAL-65","TA","2TA","SI","SELFCARE"}', 'Standard OT initial visit')
ON CONFLICT DO NOTHING;
