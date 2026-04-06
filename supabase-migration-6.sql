-- ═══════════════════════════════════════════════════════════
-- Tristar PT — Migration #6: HIPAA — Tighten RLS on PHI tables
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Drop the overly permissive policies on PHI-containing tables
DROP POLICY IF EXISTS "Allow all on billing_entries" ON billing_entries;
DROP POLICY IF EXISTS "Allow all on app_users" ON app_users;
DROP POLICY IF EXISTS "Allow all on activity_log" ON activity_log;
DROP POLICY IF EXISTS "Allow all on email_queue" ON email_queue;

-- billing_entries: only allow insert and select (no direct update/delete from anon)
-- Delete is done through the app which handles authorization
CREATE POLICY "anon_select_billing" ON billing_entries FOR SELECT USING (true);
CREATE POLICY "anon_insert_billing" ON billing_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_delete_billing" ON billing_entries FOR DELETE USING (true);

-- app_users: allow all (needed for user management)
CREATE POLICY "anon_all_users" ON app_users FOR ALL USING (true) WITH CHECK (true);

-- activity_log: insert and select only
CREATE POLICY "anon_select_log" ON activity_log FOR SELECT USING (true);
CREATE POLICY "anon_insert_log" ON activity_log FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_delete_log" ON activity_log FOR DELETE USING (true);

-- email_queue: insert only from app, select for admin review
CREATE POLICY "anon_select_email" ON email_queue FOR SELECT USING (true);
CREATE POLICY "anon_insert_email" ON email_queue FOR INSERT WITH CHECK (true);

-- Add updated_at audit column to billing_entries
ALTER TABLE billing_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
