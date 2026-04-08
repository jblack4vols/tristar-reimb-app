import { createClient } from '@supabase/supabase-js';

// Supabase anon key is a public key designed for client-side use (RLS enforces security)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qkdwondlzlsftungslnm.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZHdvbmRsemxzZnR1bmdzbG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Mzc4NjcsImV4cCI6MjA5MDExMzg2N30.BiudW2FgGEQCywpbMmvjA88K8arY9zSR2IFp5kGYKyk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
