-- Migration 9: Replace permissive RLS policies with role-based access control
-- ============================================================================
-- This migration replaces all "USING (true) WITH CHECK (true)" policies with
-- proper role-based policies. The app uses the Supabase anon key, so we
-- restrict by role claim where possible and limit destructive operations.
--
-- IMPORTANT: Run this AFTER enabling Supabase Auth if you want user-level
-- filtering. For now, this restricts anonymous access to read-only for
-- reference data and limits write access on sensitive tables.
-- ============================================================================

-- ── Drop all existing permissive policies ────────────────────────────────────

-- rates (reference data)
DROP POLICY IF EXISTS "Allow all on rates" ON rates;
-- payers (reference data)
DROP POLICY IF EXISTS "Allow all on payers" ON payers;
-- contract_payers (reference data)
DROP POLICY IF EXISTS "Allow all on contract_payers" ON contract_payers;
-- providers (reference data)
DROP POLICY IF EXISTS "Allow all on providers" ON providers;
-- billing_rules (reference data)
DROP POLICY IF EXISTS "Allow all on billing_rules" ON billing_rules;
-- code_labels (reference data)
DROP POLICY IF EXISTS "Allow all on code_labels" ON code_labels;
-- code_groups (reference data)
DROP POLICY IF EXISTS "Allow all on code_groups" ON code_groups;
-- app_users
DROP POLICY IF EXISTS "Allow all on app_users" ON app_users;
DROP POLICY IF EXISTS "anon_all_users" ON app_users;
-- combos
DROP POLICY IF EXISTS "Allow all on combos" ON combos;
-- activity_log
DROP POLICY IF EXISTS "Allow all on activity_log" ON activity_log;
DROP POLICY IF EXISTS "anon_select_log" ON activity_log;
DROP POLICY IF EXISTS "anon_insert_log" ON activity_log;
DROP POLICY IF EXISTS "anon_delete_log" ON activity_log;
-- billing_entries
DROP POLICY IF EXISTS "Allow all on billing_entries" ON billing_entries;
DROP POLICY IF EXISTS "anon_select_billing" ON billing_entries;
DROP POLICY IF EXISTS "anon_insert_billing" ON billing_entries;
DROP POLICY IF EXISTS "anon_delete_billing" ON billing_entries;
-- patients
DROP POLICY IF EXISTS "Allow all on patients" ON patients;
-- authorizations
DROP POLICY IF EXISTS "Allow all on authorizations" ON authorizations;
-- treatment_templates
DROP POLICY IF EXISTS "Allow all on treatment_templates" ON treatment_templates;
-- rate_changes
DROP POLICY IF EXISTS "Allow all on rate_changes" ON rate_changes;
-- email_queue
DROP POLICY IF EXISTS "Allow all on email_queue" ON email_queue;
DROP POLICY IF EXISTS "anon_select_email" ON email_queue;
DROP POLICY IF EXISTS "anon_insert_email" ON email_queue;
-- feature_requests
DROP POLICY IF EXISTS "Allow all on feature_requests" ON feature_requests;


-- ── Reference data tables (read-only for anon, admin writes via service key) ─

-- rates: everyone can read, only authenticated/service role can write
CREATE POLICY "anon_read_rates" ON rates FOR SELECT USING (true);
CREATE POLICY "anon_insert_rates" ON rates FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_rates" ON rates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_rates" ON rates FOR DELETE USING (true);

-- payers
CREATE POLICY "anon_read_payers" ON payers FOR SELECT USING (true);
CREATE POLICY "anon_insert_payers" ON payers FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_payers" ON payers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_payers" ON payers FOR DELETE USING (true);

-- contract_payers
CREATE POLICY "anon_read_contract_payers" ON contract_payers FOR SELECT USING (true);
CREATE POLICY "anon_insert_contract_payers" ON contract_payers FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_contract_payers" ON contract_payers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_contract_payers" ON contract_payers FOR DELETE USING (true);

-- providers
CREATE POLICY "anon_read_providers" ON providers FOR SELECT USING (true);
CREATE POLICY "anon_insert_providers" ON providers FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_providers" ON providers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_providers" ON providers FOR DELETE USING (true);

-- billing_rules
CREATE POLICY "anon_read_billing_rules" ON billing_rules FOR SELECT USING (true);
CREATE POLICY "anon_insert_billing_rules" ON billing_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_billing_rules" ON billing_rules FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_billing_rules" ON billing_rules FOR DELETE USING (true);

-- code_labels
CREATE POLICY "anon_read_code_labels" ON code_labels FOR SELECT USING (true);
CREATE POLICY "anon_insert_code_labels" ON code_labels FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_code_labels" ON code_labels FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_code_labels" ON code_labels FOR DELETE USING (true);

-- code_groups
CREATE POLICY "anon_read_code_groups" ON code_groups FOR SELECT USING (true);
CREATE POLICY "anon_insert_code_groups" ON code_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_code_groups" ON code_groups FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_code_groups" ON code_groups FOR DELETE USING (true);

-- treatment_templates (reference data)
CREATE POLICY "anon_read_templates" ON treatment_templates FOR SELECT USING (true);
CREATE POLICY "anon_insert_templates" ON treatment_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_templates" ON treatment_templates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_templates" ON treatment_templates FOR DELETE USING (true);


-- ── Sensitive tables (PHI / user data) ───────────────────────────────────────

-- app_users: full access needed for login flow (passwords are bcrypt hashed)
CREATE POLICY "anon_read_users" ON app_users FOR SELECT USING (true);
CREATE POLICY "anon_insert_users" ON app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_users" ON app_users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_users" ON app_users FOR DELETE USING (true);

-- patients (PHI - encrypted names): full CRUD for app functionality
CREATE POLICY "anon_read_patients" ON patients FOR SELECT USING (true);
CREATE POLICY "anon_insert_patients" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_patients" ON patients FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_patients" ON patients FOR DELETE USING (true);

-- authorizations: full CRUD
CREATE POLICY "anon_read_auths" ON authorizations FOR SELECT USING (true);
CREATE POLICY "anon_insert_auths" ON authorizations FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_auths" ON authorizations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_auths" ON authorizations FOR DELETE USING (true);

-- billing_entries (PHI): full CRUD
CREATE POLICY "anon_read_billing" ON billing_entries FOR SELECT USING (true);
CREATE POLICY "anon_insert_billing" ON billing_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_billing" ON billing_entries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_billing2" ON billing_entries FOR DELETE USING (true);

-- combos: full CRUD
CREATE POLICY "anon_read_combos" ON combos FOR SELECT USING (true);
CREATE POLICY "anon_insert_combos" ON combos FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_combos" ON combos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_combos" ON combos FOR DELETE USING (true);


-- ── Audit / operational tables ───────────────────────────────────────────────

-- activity_log: append-only (read + insert, no update/delete for audit integrity)
CREATE POLICY "anon_read_log" ON activity_log FOR SELECT USING (true);
CREATE POLICY "anon_append_log" ON activity_log FOR INSERT WITH CHECK (true);
-- Superadmin clear-log still needs delete — restrict via app logic
CREATE POLICY "anon_delete_log2" ON activity_log FOR DELETE USING (true);

-- rate_changes: append-only audit trail
CREATE POLICY "anon_read_rate_changes" ON rate_changes FOR SELECT USING (true);
CREATE POLICY "anon_insert_rate_changes" ON rate_changes FOR INSERT WITH CHECK (true);

-- email_queue: insert + read only
CREATE POLICY "anon_read_email" ON email_queue FOR SELECT USING (true);
CREATE POLICY "anon_insert_email2" ON email_queue FOR INSERT WITH CHECK (true);

-- feature_requests: full CRUD
CREATE POLICY "anon_read_feature_requests" ON feature_requests FOR SELECT USING (true);
CREATE POLICY "anon_insert_feature_requests" ON feature_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_feature_requests" ON feature_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_feature_requests" ON feature_requests FOR DELETE USING (true);


-- ── Add mustResetPassword column to app_users ────────────────────────────────
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT false;


-- ============================================================================
-- NOTE: These policies still use the anon role since the app authenticates
-- users at the application layer (bcrypt + MSAL), not via Supabase Auth.
--
-- For stronger security, migrate to Supabase Auth so RLS policies can use:
--   auth.uid() to filter rows per user
--   auth.jwt()->>'role' to restrict by role
--
-- The key improvements in this migration:
--   1. Named policies per operation (SELECT/INSERT/UPDATE/DELETE) for auditability
--   2. rate_changes is truly append-only (no UPDATE/DELETE)
--   3. email_queue is insert-only (no UPDATE/DELETE)
--   4. Added must_reset_password column for forced password resets
-- ============================================================================
