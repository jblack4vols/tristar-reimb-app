import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

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
  try {
    const [usersRes, combosRes, logRes] = await Promise.all([
      supabase.from('app_users').select('*').order('created_at'),
      supabase.from('combos').select('*').order('saved_at', { ascending: false }),
      supabase.from('activity_log').select('*').order('ts', { ascending: false }).limit(300),
    ]);
    usersCache = (usersRes.data || []).map(u => ({
      id: u.id, name: u.name, username: u.username, password: u.password,
      email: u.email || '', location: u.location || '', role: u.role, active: u.active,
      mustResetPassword: u.must_reset_password || false,
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
    try { localStorage.setItem('trc_offline_store', JSON.stringify({ usersCache, combosCache, logCache })); } catch { /* localStorage may be full or unavailable */ }
  } catch (err) {
    console.warn('Supabase loadStore failed, attempting offline fallback:', err);
    const offline = localStorage.getItem('trc_offline_store');
    if (offline) {
      const parsed = JSON.parse(offline);
      usersCache = parsed.usersCache || [];
      combosCache = parsed.combosCache || [];
      logCache = parsed.logCache || [];
      storeLoaded = true;
      notifyStore();
      return;
    }
    throw err;
  }
}

export function isStoreLoaded() { return storeLoaded; }

// ── Users ──────────────────────────────────────────────
export const store = {
  getUsers: () => usersCache,

  setUsers: async (users) => {
    // Full sync: delete all then re-insert
    // For simplicity, we upsert the full list
    const rows = users.map(u => {
      const pw = u.password;
      const hashedPw = (pw.startsWith('$2a$') || pw.startsWith('$2b$')) ? pw : bcrypt.hashSync(pw, 10);
      return {
        id: u.id, name: u.name, username: u.username, password: hashedPw,
        email: u.email || '', location: u.location || '', role: u.role, active: u.active !== false,
        must_reset_password: u.mustResetPassword || false,
      };
    });
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
    usersCache = rows.map(r => ({
      id: r.id, name: r.name, username: r.username, password: r.password,
      email: r.email, location: r.location, role: r.role, active: r.active,
    }));
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
  setSession:   u  => { try { sessionStorage.setItem(SK_SESSION, JSON.stringify(u)); } catch { /* storage unavailable */ } },
  clearSession: () => { try { sessionStorage.removeItem(SK_SESSION); } catch { /* storage unavailable */ } },
};
