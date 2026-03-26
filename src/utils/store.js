import { supabase } from './supabase';

const SK_SESSION = 'trc_session_v3';

// ── In-memory caches (populated by loadStore) ──────────
let usersCache = [];
let combosCache = [];
let logCache = [];
let storeLoaded = false;

function notifyStore() {
  window.dispatchEvent(new Event('trc-store-updated'));
}

// ── Initial load from Supabase ─────────────────────────
export async function loadStore() {
  const [usersRes, combosRes, logRes] = await Promise.all([
    supabase.from('app_users').select('*').order('created_at'),
    supabase.from('combos').select('*').order('saved_at', { ascending: false }),
    supabase.from('activity_log').select('*').order('ts', { ascending: false }).limit(300),
  ]);
  usersCache = (usersRes.data || []).map(u => ({
    id: u.id, name: u.name, username: u.username, password: u.password,
    email: u.email || '', location: u.location || '', role: u.role, active: u.active,
  }));
  combosCache = (combosRes.data || []).map(c => ({
    id: c.id, name: c.name, codes: c.codes || [], payer: c.payer || '',
    provider: c.provider || '', owner: c.owner || '', ownerId: c.owner_id || '',
    savedAt: c.saved_at,
  }));
  logCache = (logRes.data || []).map(l => ({
    user: l.username, action: l.action, detail: l.detail || '', ts: l.ts,
  }));
  storeLoaded = true;
  notifyStore();
}

export function isStoreLoaded() { return storeLoaded; }

// ── Users ──────────────────────────────────────────────
export const store = {
  getUsers: () => usersCache,

  setUsers: async (users) => {
    // Full sync: delete all then re-insert
    // For simplicity, we upsert the full list
    const rows = users.map(u => ({
      id: u.id, name: u.name, username: u.username, password: u.password,
      email: u.email || '', location: u.location || '', role: u.role, active: u.active !== false,
    }));
    // Delete users not in the new list
    const newIds = rows.map(r => r.id);
    const oldIds = usersCache.map(u => u.id);
    const toDelete = oldIds.filter(id => !newIds.includes(id));
    if (toDelete.length > 0) {
      await supabase.from('app_users').delete().in('id', toDelete);
    }
    if (rows.length > 0) {
      await supabase.from('app_users').upsert(rows, { onConflict: 'id' });
    }
    usersCache = users;
    notifyStore();
  },

  // ── Combos ─────────────────────────────────────────
  getCombos: () => combosCache,

  setCombos: async (combos) => {
    const rows = combos.map(c => ({
      id: c.id, name: c.name, codes: c.codes || [], payer: c.payer || '',
      provider: c.provider || '', owner: c.owner || '', owner_id: c.ownerId || '',
      saved_at: c.savedAt || new Date().toISOString(),
    }));
    const newIds = rows.map(r => r.id);
    const oldIds = combosCache.map(c => c.id);
    const toDelete = oldIds.filter(id => !newIds.includes(id));
    if (toDelete.length > 0) {
      await supabase.from('combos').delete().in('id', toDelete);
    }
    if (rows.length > 0) {
      await supabase.from('combos').upsert(rows, { onConflict: 'id' });
    }
    combosCache = combos;
    notifyStore();
  },

  // ── Activity Log ───────────────────────────────────
  getLog: () => logCache,

  pushLog: async (entry) => {
    const row = {
      username: entry.user || '',
      action: entry.action || '',
      detail: entry.detail || '',
    };
    const { data } = await supabase.from('activity_log').insert(row).select().single();
    const cached = {
      user: row.username, action: row.action, detail: row.detail,
      ts: data?.ts || new Date().toISOString(),
    };
    logCache.unshift(cached);
    if (logCache.length > 300) logCache.length = 300;
    notifyStore();
  },

  clearLog: async () => {
    await supabase.from('activity_log').delete().neq('id', 0);
    logCache = [];
    notifyStore();
  },

  // ── Session (stays in sessionStorage — browser-local) ──
  getSession:   () => { try { return JSON.parse(sessionStorage.getItem(SK_SESSION) || 'null'); } catch { return null; } },
  setSession:   u  => { try { sessionStorage.setItem(SK_SESSION, JSON.stringify(u)); } catch {} },
  clearSession: () => { try { sessionStorage.removeItem(SK_SESSION); } catch {} },
};
