-- ═══════════════════════════════════════════════════════════
-- Tristar PT Reimbursement App — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- Rates: one row per code+payer combination
CREATE TABLE IF NOT EXISTS rates (
  code    TEXT NOT NULL,
  payer   TEXT NOT NULL,
  amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (code, payer)
);

-- Fee-schedule payers (ordered list)
CREATE TABLE IF NOT EXISTS payers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

-- Contract / day-rate payers
CREATE TABLE IF NOT EXISTS contract_payers (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  rate NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- Providers grouped by location
CREATE TABLE IF NOT EXISTS providers (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  location TEXT NOT NULL,
  is_ot    BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (name, location)
);

-- Billing rules per payer
CREATE TABLE IF NOT EXISTS billing_rules (
  id         SERIAL PRIMARY KEY,
  payer      TEXT NOT NULL,
  rule_text  TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- Code labels and descriptions
CREATE TABLE IF NOT EXISTS code_labels (
  code        TEXT PRIMARY KEY,
  description TEXT NOT NULL DEFAULT ''
);

-- Code groups for the UI category pills
CREATE TABLE IF NOT EXISTS code_groups (
  id         SERIAL PRIMARY KEY,
  group_key  TEXT NOT NULL,
  label      TEXT NOT NULL,
  codes      TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0
);

-- ── Row Level Security ──────────────────────────────────
-- Allow public read (the app uses anon key), restrict writes to authenticated or anon
-- For a small internal app, we allow anon read+write. Tighten later if needed.

ALTER TABLE rates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_labels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_groups    ENABLE ROW LEVEL SECURITY;

-- Policies: allow all operations for anon role (internal app)
CREATE POLICY "Allow all on rates"           ON rates           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on payers"          ON payers          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on contract_payers" ON contract_payers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on providers"       ON providers       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on billing_rules"   ON billing_rules   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on code_labels"     ON code_labels     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on code_groups"     ON code_groups     FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- SEED DATA — Populate tables with current hardcoded defaults
-- ═══════════════════════════════════════════════════════════

-- ── Payers ──────────────────────────────────────────────
INSERT INTO payers (name, sort_order) VALUES
  ('Medicare', 1), ('BCBS Commercial', 2), ('VA CCN', 3),
  ('Humana Medicare', 4), ('BCBS Medicare', 5), ('BlueCare', 6),
  ('Amerigroup / WellPoint', 7), ('Amerivantage', 8), ('WellCare', 9),
  ('Tricare East', 10), ('Dept of Labor', 11), ('Aetna', 12), ('Ambetter', 13)
ON CONFLICT (name) DO NOTHING;

-- ── Contract Payers ─────────────────────────────────────
INSERT INTO contract_payers (name, rate) VALUES
  ('BARDAVON', 105), ('CIGNA / ASH', 100), ('Keyscripts', 105),
  ('MEDRISK', 80), ('ONECALL', 80), ('Self Pay', 125),
  ('SPNet', 80), ('UMR', 60), ('UHC', 60), ('UHSS', 60)
ON CONFLICT (name) DO NOTHING;

-- ── Providers ───────────────────────────────────────────
INSERT INTO providers (name, location, is_ot) VALUES
  ('Julia Bentley','Morristown',false),('Rachel Harris','Morristown',false),
  ('Sydney Hurd (OT)','Morristown',true),('Donnie Newberry Jr','Morristown',false),
  ('Kirsten Wright','Morristown',false),('Andrew Fowler','Morristown',false),
  ('Kristen Bonk','Maryville',false),('Caitlin Neely','Maryville',false),
  ('Emma Patterson (OT)','Maryville',true),
  ('Emily Moucha','Bean Station',false),('Elizabeth Reece (OT)','Bean Station',true),
  ('Kesley Kirk','Newport',false),('Alexander McGlohon (OT)','Newport',true),
  ('Nicholas Moore','Jefferson City',false),('Madison Misenheimer (OT)','Jefferson City',true),
  ('Logan Harris','Rogersville',false),('Etta Rich (OT)','Rogersville',true),
  ('Jacob Runions','New Tazewell',false),
  ('Jeremy Cook','Johnson City',false),('Kaiden Miller (OT)','Johnson City',true),
  ('Jordan Black','PRN',false),('Morgan Black','PRN',false)
ON CONFLICT (name, location) DO NOTHING;

-- ── Code Labels ─────────────────────────────────────────
INSERT INTO code_labels (code, description) VALUES
  ('DN1','Dry Needling (1–2 muscles)'),('DN2','Dry Needling (3+ muscles)'),
  ('ST','Strapping – Thorax'),('SSH','Strapping – Shoulder'),('SE','Strapping – Elbow'),
  ('SHAND','Strapping – Hand'),('SHIP','Strapping – Hip'),('SK','Strapping – Knee'),
  ('SF','Strapping – Foot/Ankle'),('STOE','Strapping – Toe'),
  ('CR','Canalith Repositioning'),('TRX','Traction'),
  ('ES','E-Stim (97014)'),('ESM','E-Stim Medicare (G0283)'),
  ('VASO','Vasopneumatic'),('PB','Paraffin Bath'),('IONTO','Iontophoresis'),('US','Ultrasound'),
  ('TX','Therapeutic Exercise'),('2TX','Therapeutic Exercise ×2'),
  ('3TX','Therapeutic Exercise ×3'),('4TX','Therapeutic Exercise ×4'),
  ('NR','Neuromuscular Re-ed'),('2NR','Neuromuscular Re-ed ×2'),
  ('3NR','Neuromuscular Re-ed ×3'),('4NR','Neuromuscular Re-ed ×4'),
  ('AQ','Aquatic Therapy'),('AQ2','Aquatic Therapy ×2'),('AQ3','Aquatic Therapy ×3'),
  ('AQ4','Aquatic Therapy ×4'),('AQ5','Aquatic Therapy ×5'),
  ('GT','Gait Training'),('2GT','Gait Training ×2'),('3GT','Gait Training ×3'),
  ('MT','Manual Therapy'),('2MT','Manual Therapy ×2'),('3MT','Manual Therapy ×3'),('4MT','Manual Therapy ×4'),
  ('GPT','Group Therapy'),
  ('EVAL-61','PT Eval – Low'),('EVAL-62','PT Eval – Medium'),('EVAL-63','PT Eval – High'),('RE-EVAL-4','PT Re-Eval'),
  ('EVAL-65','OT Eval – Low'),('EVAL-66','OT Eval – Medium'),('EVAL-67','OT Eval – High'),('RE-EVAL-8','OT Re-Eval'),
  ('TA','Therapeutic Activity'),('2TA','Therapeutic Activity ×2'),
  ('3TA','Therapeutic Activity ×3'),('4TA','Therapeutic Activity ×4'),
  ('SI','Sensory Integration'),('SELFCARE','Self-Care / Home Mgmt'),
  ('WC','Wound Care'),('WC2','Wound Care (add-on)'),
  ('PPT','Physical Performance Test'),
  ('OM','Orthotic Mgmt'),('2OM','Orthotic Mgmt ×2'),('3OM','Orthotic Mgmt ×3')
ON CONFLICT (code) DO NOTHING;

-- ── Code Groups ─────────────────────────────────────────
INSERT INTO code_groups (group_key, label, codes, sort_order) VALUES
  ('Therapeutic','Therapeutic','{"TX","2TX","3TX","4TX","NR","2NR","3NR","4NR","MT","2MT","3MT","4MT","TA","2TA","3TA","4TA","GT","2GT","3GT","GPT"}',1),
  ('Modalities','Modalities','{"ESM","ES","VASO","US","TRX","PB","IONTO","CR","PPT","SELFCARE","SI"}',2),
  ('Aquatic','Aquatic','{"AQ","AQ2","AQ3","AQ4","AQ5"}',3),
  ('Strapping','Strapping','{"ST","SSH","SE","SHAND","SHIP","SK","SF","STOE"}',4),
  ('DryNeedling','Dry Needling','{"DN1","DN2"}',5),
  ('WoundCare','Wound Care','{"WC","WC2"}',6),
  ('Orthotic','Orthotic Mgmt','{"OM","2OM","3OM"}',7)
ON CONFLICT DO NOTHING;

-- ── Billing Rules ───────────────────────────────────────
INSERT INTO billing_rules (payer, rule_text, sort_order) VALUES
  ('Aetna','Manual Therapy (97140) and Massage (97124) cannot be billed together.',1),
  ('Aetna','Therapeutic Activity (TA) and Manual Therapy (MT) cannot be on the same claim.',2),
  ('Humana Medicare','Group Therapy and Manual Therapy cannot be billed together.',1),
  ('Humana Medicare','No 97-modifier on codes beginning with 2 (strapping, dry needling).',2),
  ('Medicare','No modifier on any code beginning with 2 — includes all strapping and dry needling codes.',1),
  ('Cigna','Do not bill Vasopneumatic (97016), strapping codes, or dry needling codes.',1);

-- ── Rates (all 61 codes × 13 payers) ───────────────────
INSERT INTO rates (code, payer, amount) VALUES
  ('DN1','Medicare',22.51),('DN1','BCBS Commercial',0),('DN1','VA CCN',22.88),('DN1','Humana Medicare',18.30),('DN1','BCBS Medicare',0),('DN1','BlueCare',0),('DN1','Amerigroup / WellPoint',19.78),('DN1','Amerivantage',0),('DN1','WellCare',0),('DN1','Tricare East',0),('DN1','Dept of Labor',0),('DN1','Aetna',0),('DN1','Ambetter',0),
  ('DN2','Medicare',32.90),('DN2','BCBS Commercial',0),('DN2','VA CCN',33.44),('DN2','Humana Medicare',26.71),('DN2','BCBS Medicare',0),('DN2','BlueCare',0),('DN2','Amerigroup / WellPoint',29.35),('DN2','Amerivantage',0),('DN2','WellCare',0),('DN2','Tricare East',0),('DN2','Dept of Labor',0),('DN2','Aetna',0),('DN2','Ambetter',0),
  ('ST','Medicare',27.98),('ST','BCBS Commercial',0),('ST','VA CCN',28.44),('ST','Humana Medicare',0),('ST','BCBS Medicare',0),('ST','BlueCare',0),('ST','Amerigroup / WellPoint',20.39),('ST','Amerivantage',29.27),('ST','WellCare',27.87),('ST','Tricare East',22.76),('ST','Dept of Labor',0),('ST','Aetna',29.81),('ST','Ambetter',0),
  ('SSH','Medicare',26.27),('SSH','BCBS Commercial',0),('SSH','VA CCN',26.70),('SSH','Humana Medicare',26.50),('SSH','BCBS Medicare',0),('SSH','BlueCare',0),('SSH','Amerigroup / WellPoint',19.73),('SSH','Amerivantage',0),('SSH','WellCare',0),('SSH','Tricare East',21.36),('SSH','Dept of Labor',0),('SSH','Aetna',39.42),('SSH','Ambetter',26.63),
  ('SE','Medicare',25.77),('SE','BCBS Commercial',0),('SE','VA CCN',26.19),('SE','Humana Medicare',21.21),('SE','BCBS Medicare',0),('SE','BlueCare',0),('SE','Amerigroup / WellPoint',22.85),('SE','Amerivantage',0),('SE','WellCare',0),('SE','Tricare East',20.94),('SE','Dept of Labor',0),('SE','Aetna',38.21),('SE','Ambetter',26.12),
  ('SHAND','Medicare',26.22),('SHAND','BCBS Commercial',0),('SHAND','VA CCN',26.65),('SHAND','Humana Medicare',15.67),('SHAND','BCBS Medicare',0),('SHAND','BlueCare',0),('SHAND','Amerigroup / WellPoint',23.10),('SHAND','Amerivantage',0),('SHAND','WellCare',0),('SHAND','Tricare East',0),('SHAND','Dept of Labor',0),('SHAND','Aetna',0),('SHAND','Ambetter',0),
  ('SHIP','Medicare',30.44),('SHIP','BCBS Commercial',0),('SHIP','VA CCN',26.30),('SHIP','Humana Medicare',26.59),('SHIP','BCBS Medicare',0),('SHIP','BlueCare',0),('SHIP','Amerigroup / WellPoint',21.50),('SHIP','Amerivantage',26.44),('SHIP','WellCare',0),('SHIP','Tricare East',24.75),('SHIP','Dept of Labor',0),('SHIP','Aetna',0),('SHIP','Ambetter',33.06),
  ('SK','Medicare',26.16),('SK','BCBS Commercial',0),('SK','VA CCN',22.60),('SK','Humana Medicare',15.94),('SK','BCBS Medicare',0),('SK','BlueCare',0),('SK','Amerigroup / WellPoint',19.51),('SK','Amerivantage',22.24),('SK','WellCare',0),('SK','Tricare East',21.26),('SK','Dept of Labor',0),('SK','Aetna',0),('SK','Ambetter',28.42),
  ('SF','Medicare',25.20),('SF','BCBS Commercial',0),('SF','VA CCN',21.77),('SF','Humana Medicare',15.06),('SF','BCBS Medicare',0),('SF','BlueCare',0),('SF','Amerigroup / WellPoint',17.21),('SF','Amerivantage',0),('SF','WellCare',0),('SF','Tricare East',20.48),('SF','Dept of Labor',0),('SF','Aetna',35.69),('SF','Ambetter',27.37),
  ('STOE','Medicare',15.00),('STOE','BCBS Commercial',0),('STOE','VA CCN',0),('STOE','Humana Medicare',0),('STOE','BCBS Medicare',0),('STOE','BlueCare',0),('STOE','Amerigroup / WellPoint',0),('STOE','Amerivantage',0),('STOE','WellCare',0),('STOE','Tricare East',0),('STOE','Dept of Labor',0),('STOE','Aetna',0),('STOE','Ambetter',0),
  ('CR','Medicare',38.37),('CR','BCBS Commercial',40.00),('CR','VA CCN',0),('CR','Humana Medicare',25.00),('CR','BCBS Medicare',30.00),('CR','BlueCare',32.98),('CR','Amerigroup / WellPoint',42.11),('CR','Amerivantage',0),('CR','WellCare',0),('CR','Tricare East',0),('CR','Dept of Labor',0),('CR','Aetna',39.09),('CR','Ambetter',31.19),
  ('TRX','Medicare',10.86),('TRX','BCBS Commercial',12.18),('TRX','VA CCN',0),('TRX','Humana Medicare',7.24),('TRX','BCBS Medicare',9.37),('TRX','BlueCare',13.48),('TRX','Amerigroup / WellPoint',8.63),('TRX','Amerivantage',0),('TRX','WellCare',0),('TRX','Tricare East',6.88),('TRX','Dept of Labor',0),('TRX','Aetna',0),('TRX','Ambetter',9.50),
  ('ES','Medicare',0),('ES','BCBS Commercial',11.74),('ES','VA CCN',0),('ES','Humana Medicare',0),('ES','BCBS Medicare',12.25),('ES','BlueCare',0),('ES','Amerigroup / WellPoint',0),('ES','Amerivantage',0),('ES','WellCare',0),('ES','Tricare East',18.44),('ES','Dept of Labor',0),('ES','Aetna',0),('ES','Ambetter',11.51),
  ('ESM','Medicare',7.58),('ESM','BCBS Commercial',0),('ESM','VA CCN',7.44),('ESM','Humana Medicare',5.84),('ESM','BCBS Medicare',8.57),('ESM','BlueCare',9.01),('ESM','Amerigroup / WellPoint',9.62),('ESM','Amerivantage',7.28),('ESM','WellCare',7.82),('ESM','Tricare East',17.90),('ESM','Dept of Labor',0),('ESM','Aetna',6.31),('ESM','Ambetter',7.88),
  ('VASO','Medicare',8.32),('VASO','BCBS Commercial',14.26),('VASO','VA CCN',7.19),('VASO','Humana Medicare',5.63),('VASO','BCBS Medicare',8.29),('VASO','BlueCare',10.93),('VASO','Amerigroup / WellPoint',7.70),('VASO','Amerivantage',9.14),('VASO','WellCare',7.05),('VASO','Tricare East',8.74),('VASO','Dept of Labor',17.51),('VASO','Aetna',4.53),('VASO','Ambetter',7.87),
  ('PB','Medicare',3.80),('PB','BCBS Commercial',0),('PB','VA CCN',3.86),('PB','Humana Medicare',0),('PB','BCBS Medicare',0),('PB','BlueCare',5.59),('PB','Amerigroup / WellPoint',4.91),('PB','Amerivantage',0),('PB','WellCare',0),('PB','Tricare East',4.48),('PB','Dept of Labor',7.93),('PB','Aetna',0),('PB','Ambetter',0),
  ('IONTO','Medicare',0),('IONTO','BCBS Commercial',16.24),('IONTO','VA CCN',0),('IONTO','Humana Medicare',5.00),('IONTO','BCBS Medicare',0),('IONTO','BlueCare',0),('IONTO','Amerigroup / WellPoint',15.64),('IONTO','Amerivantage',0),('IONTO','WellCare',0),('IONTO','Tricare East',0),('IONTO','Dept of Labor',40.00),('IONTO','Aetna',0),('IONTO','Ambetter',0),
  ('US','Medicare',9.85),('US','BCBS Commercial',9.56),('US','VA CCN',10.01),('US','Humana Medicare',7.85),('US','BCBS Medicare',9.81),('US','BlueCare',10.92),('US','Amerigroup / WellPoint',7.76),('US','Amerivantage',0),('US','WellCare',0),('US','Tricare East',10.45),('US','Dept of Labor',0),('US','Aetna',0),('US','Ambetter',9.40),
  ('TX','Medicare',18.15),('TX','BCBS Commercial',24.23),('TX','VA CCN',20.96),('TX','Humana Medicare',13.96),('TX','BCBS Medicare',18.14),('TX','BlueCare',19.04),('TX','Amerigroup / WellPoint',15.07),('TX','Amerivantage',26.75),('TX','WellCare',20.54),('TX','Tricare East',21.76),('TX','Dept of Labor',43.58),('TX','Aetna',13.18),('TX','Ambetter',19.58),
  ('2TX','Medicare',41.25),('2TX','BCBS Commercial',48.45),('2TX','VA CCN',41.92),('2TX','Humana Medicare',27.92),('2TX','BCBS Medicare',36.28),('2TX','BlueCare',38.08),('2TX','Amerigroup / WellPoint',30.14),('2TX','Amerivantage',45.30),('2TX','WellCare',41.08),('2TX','Tricare East',43.52),('2TX','Dept of Labor',87.16),('2TX','Aetna',26.36),('2TX','Ambetter',39.16),
  ('3TX','Medicare',61.87),('3TX','BCBS Commercial',72.68),('3TX','VA CCN',50.00),('3TX','Humana Medicare',41.88),('3TX','BCBS Medicare',54.42),('3TX','BlueCare',57.12),('3TX','Amerigroup / WellPoint',45.21),('3TX','Amerivantage',67.95),('3TX','WellCare',61.62),('3TX','Tricare East',65.28),('3TX','Dept of Labor',130.74),('3TX','Aetna',39.54),('3TX','Ambetter',58.74),
  ('4TX','Medicare',80.02),('4TX','BCBS Commercial',90.00),('4TX','VA CCN',60.00),('4TX','Humana Medicare',55.84),('4TX','BCBS Medicare',72.56),('4TX','BlueCare',76.16),('4TX','Amerigroup / WellPoint',60.28),('4TX','Amerivantage',90.60),('4TX','WellCare',82.16),('4TX','Tricare East',87.04),('4TX','Dept of Labor',174.32),('4TX','Aetna',52.72),('4TX','Ambetter',78.32),
  ('NR','Medicare',22.94),('NR','BCBS Commercial',25.23),('NR','VA CCN',19.81),('NR','Humana Medicare',15.53),('NR','BCBS Medicare',22.84),('NR','BlueCare',21.08),('NR','Amerigroup / WellPoint',20.17),('NR','Amerivantage',25.31),('NR','WellCare',22.84),('NR','Tricare East',24.21),('NR','Dept of Labor',48.50),('NR','Aetna',15.27),('NR','Ambetter',21.79),
  ('2NR','Medicare',45.87),('2NR','BCBS Commercial',50.47),('2NR','VA CCN',46.62),('2NR','Humana Medicare',31.07),('2NR','BCBS Medicare',45.69),('2NR','BlueCare',42.16),('2NR','Amerigroup / WellPoint',40.34),('2NR','Amerivantage',50.62),('2NR','WellCare',45.68),('2NR','Tricare East',48.42),('2NR','Dept of Labor',96.99),('2NR','Aetna',34.54),('2NR','Ambetter',43.58),
  ('3NR','Medicare',68.81),('3NR','BCBS Commercial',75.70),('3NR','VA CCN',76.88),('3NR','Humana Medicare',43.84),('3NR','BCBS Medicare',60.56),('3NR','BlueCare',63.24),('3NR','Amerigroup / WellPoint',60.51),('3NR','Amerivantage',75.93),('3NR','WellCare',68.52),('3NR','Tricare East',72.62),('3NR','Dept of Labor',145.50),('3NR','Aetna',38.94),('3NR','Ambetter',65.37),
  ('4NR','Medicare',93.19),('4NR','BCBS Commercial',100.93),('4NR','VA CCN',93.00),('4NR','Humana Medicare',55.00),('4NR','BCBS Medicare',98.49),('4NR','BlueCare',84.32),('4NR','Amerigroup / WellPoint',80.68),('4NR','Amerivantage',101.24),('4NR','WellCare',91.36),('4NR','Tricare East',96.84),('4NR','Dept of Labor',194.00),('4NR','Aetna',0),('4NR','Ambetter',87.16),
  ('AQ','Medicare',29.14),('AQ','BCBS Commercial',31.86),('AQ','VA CCN',25.00),('AQ','Humana Medicare',20.00),('AQ','BCBS Medicare',20.00),('AQ','BlueCare',21.53),('AQ','Amerigroup / WellPoint',19.09),('AQ','Amerivantage',28.83),('AQ','WellCare',0),('AQ','Tricare East',0),('AQ','Dept of Labor',29.62),('AQ','Aetna',0),('AQ','Ambetter',25.57),
  ('AQ2','Medicare',58.28),('AQ2','BCBS Commercial',63.73),('AQ2','VA CCN',59.23),('AQ2','Humana Medicare',40.00),('AQ2','BCBS Medicare',0),('AQ2','BlueCare',44.14),('AQ2','Amerigroup / WellPoint',38.19),('AQ2','Amerivantage',57.66),('AQ2','WellCare',0),('AQ2','Tricare East',0),('AQ2','Dept of Labor',59.23),('AQ2','Aetna',0),('AQ2','Ambetter',51.14),
  ('AQ3','Medicare',75.95),('AQ3','BCBS Commercial',95.59),('AQ3','VA CCN',84.21),('AQ3','Humana Medicare',60.00),('AQ3','BCBS Medicare',0),('AQ3','BlueCare',66.20),('AQ3','Amerigroup / WellPoint',57.27),('AQ3','Amerivantage',86.49),('AQ3','WellCare',0),('AQ3','Tricare East',0),('AQ3','Dept of Labor',66.01),('AQ3','Aetna',0),('AQ3','Ambetter',76.72),
  ('AQ4','Medicare',94.60),('AQ4','BCBS Commercial',127.45),('AQ4','VA CCN',109.19),('AQ4','Humana Medicare',80.00),('AQ4','BCBS Medicare',0),('AQ4','BlueCare',88.27),('AQ4','Amerigroup / WellPoint',76.36),('AQ4','Amerivantage',0),('AQ4','WellCare',0),('AQ4','Tricare East',0),('AQ4','Dept of Labor',85.59),('AQ4','Aetna',0),('AQ4','Ambetter',102.28),
  ('AQ5','Medicare',113.25),('AQ5','BCBS Commercial',159.32),('AQ5','VA CCN',115.00),('AQ5','Humana Medicare',100.00),('AQ5','BCBS Medicare',0),('AQ5','BlueCare',110.34),('AQ5','Amerigroup / WellPoint',95.45),('AQ5','Amerivantage',0),('AQ5','WellCare',0),('AQ5','Tricare East',0),('AQ5','Dept of Labor',0),('AQ5','Aetna',0),('AQ5','Ambetter',127.85),
  ('GT','Medicare',18.15),('GT','BCBS Commercial',21.17),('GT','VA CCN',17.82),('GT','Humana Medicare',13.96),('GT','BCBS Medicare',18.07),('GT','BlueCare',18.34),('GT','Amerigroup / WellPoint',14.91),('GT','Amerivantage',26.75),('GT','WellCare',17.46),('GT','Tricare East',21.76),('GT','Dept of Labor',42.78),('GT','Aetna',11.39),('GT','Ambetter',19.58),
  ('2GT','Medicare',41.25),('2GT','BCBS Commercial',42.34),('2GT','VA CCN',35.64),('2GT','Humana Medicare',27.93),('2GT','BCBS Medicare',36.14),('2GT','BlueCare',36.68),('2GT','Amerigroup / WellPoint',29.82),('2GT','Amerivantage',53.50),('2GT','WellCare',34.92),('2GT','Tricare East',43.52),('2GT','Dept of Labor',85.56),('2GT','Aetna',0),('2GT','Ambetter',0),
  ('3GT','Medicare',61.87),('3GT','BCBS Commercial',63.51),('3GT','VA CCN',53.46),('3GT','Humana Medicare',41.88),('3GT','BCBS Medicare',54.21),('3GT','BlueCare',55.02),('3GT','Amerigroup / WellPoint',44.73),('3GT','Amerivantage',80.25),('3GT','WellCare',52.38),('3GT','Tricare East',65.28),('3GT','Dept of Labor',128.34),('3GT','Aetna',0),('3GT','Ambetter',0),
  ('MT','Medicare',19.56),('MT','BCBS Commercial',22.51),('MT','VA CCN',19.88),('MT','Humana Medicare',13.25),('MT','BCBS Medicare',18.37),('MT','BlueCare',21.87),('MT','Amerigroup / WellPoint',16.21),('MT','Amerivantage',21.39),('MT','WellCare',16.56),('MT','Tricare East',20.54),('MT','Dept of Labor',39.76),('MT','Aetna',10.37),('MT','Ambetter',18.49),
  ('2MT','Medicare',39.12),('2MT','BCBS Commercial',45.02),('2MT','VA CCN',33.80),('2MT','Humana Medicare',26.50),('2MT','BCBS Medicare',36.74),('2MT','BlueCare',43.74),('2MT','Amerigroup / WellPoint',32.42),('2MT','Amerivantage',42.78),('2MT','WellCare',33.12),('2MT','Tricare East',41.09),('2MT','Dept of Labor',79.52),('2MT','Aetna',20.74),('2MT','Ambetter',36.97),
  ('3MT','Medicare',58.69),('3MT','BCBS Commercial',59.04),('3MT','VA CCN',47.72),('3MT','Humana Medicare',39.75),('3MT','BCBS Medicare',55.11),('3MT','BlueCare',65.61),('3MT','Amerigroup / WellPoint',48.64),('3MT','Amerivantage',64.17),('3MT','WellCare',49.68),('3MT','Tricare East',61.62),('3MT','Dept of Labor',119.28),('3MT','Aetna',31.11),('3MT','Ambetter',55.14),
  ('4MT','Medicare',85.27),('4MT','BCBS Commercial',65.00),('4MT','VA CCN',61.64),('4MT','Humana Medicare',53.00),('4MT','BCBS Medicare',73.48),('4MT','BlueCare',87.48),('4MT','Amerigroup / WellPoint',64.84),('4MT','Amerivantage',85.56),('4MT','WellCare',66.24),('4MT','Tricare East',82.16),('4MT','Dept of Labor',159.04),('4MT','Aetna',41.48),('4MT','Ambetter',73.52),
  ('GPT','Medicare',12.82),('GPT','BCBS Commercial',13.21),('GPT','VA CCN',11.08),('GPT','Humana Medicare',0),('GPT','BCBS Medicare',13.03),('GPT','BlueCare',15.67),('GPT','Amerigroup / WellPoint',10.66),('GPT','Amerivantage',0),('GPT','WellCare',0),('GPT','Tricare East',13.21),('GPT','Dept of Labor',0),('GPT','Aetna',0),('GPT','Ambetter',0),
  ('EVAL-61','Medicare',91.06),('EVAL-61','BCBS Commercial',59.75),('EVAL-61','VA CCN',92.54),('EVAL-61','Humana Medicare',72.85),('EVAL-61','BCBS Medicare',90.99),('EVAL-61','BlueCare',64.78),('EVAL-61','Amerigroup / WellPoint',48.48),('EVAL-61','Amerivantage',91.06),('EVAL-61','WellCare',75.99),('EVAL-61','Tricare East',74.03),('EVAL-61','Dept of Labor',146.22),('EVAL-61','Aetna',58.55),('EVAL-61','Ambetter',74.03),
  ('EVAL-62','Medicare',91.06),('EVAL-62','BCBS Commercial',59.75),('EVAL-62','VA CCN',92.54),('EVAL-62','Humana Medicare',72.85),('EVAL-62','BCBS Medicare',90.99),('EVAL-62','BlueCare',64.78),('EVAL-62','Amerigroup / WellPoint',48.48),('EVAL-62','Amerivantage',91.06),('EVAL-62','WellCare',75.99),('EVAL-62','Tricare East',74.03),('EVAL-62','Dept of Labor',146.22),('EVAL-62','Aetna',58.55),('EVAL-62','Ambetter',74.03),
  ('EVAL-63','Medicare',91.06),('EVAL-63','BCBS Commercial',59.75),('EVAL-63','VA CCN',92.54),('EVAL-63','Humana Medicare',72.85),('EVAL-63','BCBS Medicare',90.99),('EVAL-63','BlueCare',64.78),('EVAL-63','Amerigroup / WellPoint',48.48),('EVAL-63','Amerivantage',91.06),('EVAL-63','WellCare',75.99),('EVAL-63','Tricare East',74.03),('EVAL-63','Dept of Labor',146.22),('EVAL-63','Aetna',58.55),('EVAL-63','Ambetter',74.03),
  ('RE-EVAL-4','Medicare',62.56),('RE-EVAL-4','BCBS Commercial',0),('RE-EVAL-4','VA CCN',63.58),('RE-EVAL-4','Humana Medicare',0),('RE-EVAL-4','BCBS Medicare',0),('RE-EVAL-4','BlueCare',0),('RE-EVAL-4','Amerigroup / WellPoint',32.69),('RE-EVAL-4','Amerivantage',0),('RE-EVAL-4','WellCare',0),('RE-EVAL-4','Tricare East',50.86),('RE-EVAL-4','Dept of Labor',0),('RE-EVAL-4','Aetna',32.42),('RE-EVAL-4','Ambetter',0),
  ('EVAL-65','Medicare',93.34),('EVAL-65','BCBS Commercial',57.99),('EVAL-65','VA CCN',94.86),('EVAL-65','Humana Medicare',74.37),('EVAL-65','BCBS Medicare',93.26),('EVAL-65','BlueCare',62.87),('EVAL-65','Amerigroup / WellPoint',52.18),('EVAL-65','Amerivantage',93.34),('EVAL-65','WellCare',93.26),('EVAL-65','Tricare East',75.89),('EVAL-65','Dept of Labor',152.03),('EVAL-65','Aetna',56.84),('EVAL-65','Ambetter',75.89),
  ('EVAL-66','Medicare',93.34),('EVAL-66','BCBS Commercial',57.99),('EVAL-66','VA CCN',94.86),('EVAL-66','Humana Medicare',74.37),('EVAL-66','BCBS Medicare',93.26),('EVAL-66','BlueCare',62.87),('EVAL-66','Amerigroup / WellPoint',52.18),('EVAL-66','Amerivantage',93.34),('EVAL-66','WellCare',93.26),('EVAL-66','Tricare East',75.89),('EVAL-66','Dept of Labor',152.03),('EVAL-66','Aetna',56.84),('EVAL-66','Ambetter',75.89),
  ('EVAL-67','Medicare',93.34),('EVAL-67','BCBS Commercial',57.99),('EVAL-67','VA CCN',94.86),('EVAL-67','Humana Medicare',74.37),('EVAL-67','BCBS Medicare',93.26),('EVAL-67','BlueCare',62.87),('EVAL-67','Amerigroup / WellPoint',52.18),('EVAL-67','Amerivantage',93.34),('EVAL-67','WellCare',93.26),('EVAL-67','Tricare East',75.89),('EVAL-67','Dept of Labor',152.03),('EVAL-67','Aetna',56.84),('EVAL-67','Ambetter',75.89),
  ('RE-EVAL-8','Medicare',64.16),('RE-EVAL-8','BCBS Commercial',0),('RE-EVAL-8','VA CCN',65.20),('RE-EVAL-8','Humana Medicare',51.12),('RE-EVAL-8','BCBS Medicare',0),('RE-EVAL-8','BlueCare',0),('RE-EVAL-8','Amerigroup / WellPoint',35.42),('RE-EVAL-8','Amerivantage',0),('RE-EVAL-8','WellCare',0),('RE-EVAL-8','Tricare East',52.16),('RE-EVAL-8','Dept of Labor',0),('RE-EVAL-8','Aetna',35.12),('RE-EVAL-8','Ambetter',51.63),
  ('TA','Medicare',31.86),('TA','BCBS Commercial',26.07),('TA','VA CCN',32.38),('TA','Humana Medicare',21.57),('TA','BCBS Medicare',22.92),('TA','BlueCare',18.56),('TA','Amerigroup / WellPoint',19.69),('TA','Amerivantage',26.97),('TA','WellCare',31.74),('TA','Tricare East',25.90),('TA','Dept of Labor',51.89),('TA','Aetna',25.22),('TA','Ambetter',25.90),
  ('2TA','Medicare',48.32),('2TA','BCBS Commercial',52.14),('2TA','VA CCN',55.77),('2TA','Humana Medicare',37.36),('2TA','BCBS Medicare',45.84),('2TA','BlueCare',37.12),('2TA','Amerigroup / WellPoint',39.38),('2TA','Amerivantage',53.94),('2TA','WellCare',63.46),('2TA','Tricare East',51.81),('2TA','Dept of Labor',103.78),('2TA','Aetna',38.14),('2TA','Ambetter',49.21),
  ('3TA','Medicare',77.89),('3TA','BCBS Commercial',78.20),('3TA','VA CCN',79.16),('3TA','Humana Medicare',52.99),('3TA','BCBS Medicare',68.76),('3TA','BlueCare',55.68),('3TA','Amerigroup / WellPoint',59.07),('3TA','Amerivantage',80.91),('3TA','WellCare',95.20),('3TA','Tricare East',77.71),('3TA','Dept of Labor',155.67),('3TA','Aetna',46.62),('3TA','Ambetter',77.71),
  ('4TA','Medicare',102.50),('4TA','BCBS Commercial',104.27),('4TA','VA CCN',110.92),('4TA','Humana Medicare',68.62),('4TA','BCBS Medicare',91.68),('4TA','BlueCare',74.24),('4TA','Amerigroup / WellPoint',78.76),('4TA','Amerivantage',107.88),('4TA','WellCare',126.96),('4TA','Tricare East',103.60),('4TA','Dept of Labor',207.56),('4TA','Aetna',62.16),('4TA','Ambetter',98.44),
  ('SI','Medicare',50.00),('SI','BCBS Commercial',22.04),('SI','VA CCN',0),('SI','Humana Medicare',0),('SI','BCBS Medicare',0),('SI','BlueCare',0),('SI','Amerigroup / WellPoint',21.44),('SI','Amerivantage',0),('SI','WellCare',0),('SI','Tricare East',0),('SI','Dept of Labor',0),('SI','Aetna',0),('SI','Ambetter',0),
  ('SELFCARE','Medicare',22.05),('SELFCARE','BCBS Commercial',0),('SELFCARE','VA CCN',22.41),('SELFCARE','Humana Medicare',15.36),('SELFCARE','BCBS Medicare',0),('SELFCARE','BlueCare',20.96),('SELFCARE','Amerigroup / WellPoint',19.87),('SELFCARE','Amerivantage',0),('SELFCARE','WellCare',0),('SELFCARE','Tricare East',0),('SELFCARE','Dept of Labor',0),('SELFCARE','Aetna',15.97),('SELFCARE','Ambetter',24.07),
  ('WC','Medicare',87.26),('WC','BCBS Commercial',54.88),('WC','VA CCN',88.68),('WC','Humana Medicare',0),('WC','BCBS Medicare',77.08),('WC','BlueCare',0),('WC','Amerigroup / WellPoint',0),('WC','Amerivantage',0),('WC','WellCare',0),('WC','Tricare East',0),('WC','Dept of Labor',72.93),('WC','Aetna',0),('WC','Ambetter',0),
  ('WC2','Medicare',87.26),('WC2','BCBS Commercial',36.41),('WC2','VA CCN',79.90),('WC2','Humana Medicare',0),('WC2','BCBS Medicare',34.46),('WC2','BlueCare',0),('WC2','Amerigroup / WellPoint',0),('WC2','Amerivantage',0),('WC2','WellCare',0),('WC2','Tricare East',0),('WC2','Dept of Labor',24.50),('WC2','Aetna',0),('WC2','Ambetter',0),
  ('PPT','Medicare',19.92),('PPT','BCBS Commercial',0),('PPT','VA CCN',22.99),('PPT','Humana Medicare',15.40),('PPT','BCBS Medicare',0),('PPT','BlueCare',20.80),('PPT','Amerigroup / WellPoint',21.62),('PPT','Amerivantage',30.75),('PPT','WellCare',19.15),('PPT','Tricare East',25.00),('PPT','Dept of Labor',0),('PPT','Aetna',0),('PPT','Ambetter',0),
  ('OM','Medicare',0),('OM','BCBS Commercial',0),('OM','VA CCN',30.00),('OM','Humana Medicare',0),('OM','BCBS Medicare',0),('OM','BlueCare',0),('OM','Amerigroup / WellPoint',26.79),('OM','Amerivantage',0),('OM','WellCare',0),('OM','Tricare East',0),('OM','Dept of Labor',26.79),('OM','Aetna',0),('OM','Ambetter',0),
  ('2OM','Medicare',0),('2OM','BCBS Commercial',0),('2OM','VA CCN',50.00),('2OM','Humana Medicare',0),('2OM','BCBS Medicare',0),('2OM','BlueCare',0),('2OM','Amerigroup / WellPoint',53.58),('2OM','Amerivantage',0),('2OM','WellCare',0),('2OM','Tricare East',0),('2OM','Dept of Labor',36.74),('2OM','Aetna',0),('2OM','Ambetter',0),
  ('3OM','Medicare',0),('3OM','BCBS Commercial',0),('3OM','VA CCN',70.00),('3OM','Humana Medicare',0),('3OM','BCBS Medicare',0),('3OM','BlueCare',0),('3OM','Amerigroup / WellPoint',0),('3OM','Amerivantage',0),('3OM','WellCare',0),('3OM','Tricare East',0),('3OM','Dept of Labor',54.14),('3OM','Aetna',0),('3OM','Ambetter',0)
ON CONFLICT (code, payer) DO NOTHING;
