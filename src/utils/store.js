const SK_USERS   = 'trc_users_v3';
const SK_COMBOS  = 'trc_combos_v3';
const SK_LOG     = 'trc_log_v3';
const SK_SESSION = 'trc_session_v3';

export const store = {
  getUsers:    () => { try { return JSON.parse(localStorage.getItem(SK_USERS)  || '[]'); } catch { return []; } },
  setUsers:    d  => { try { localStorage.setItem(SK_USERS,  JSON.stringify(d)); } catch {} },
  getCombos:   () => { try { return JSON.parse(localStorage.getItem(SK_COMBOS) || '[]'); } catch { return []; } },
  setCombos:   d  => { try { localStorage.setItem(SK_COMBOS, JSON.stringify(d)); } catch {} },
  getLog:      () => { try { return JSON.parse(localStorage.getItem(SK_LOG)    || '[]'); } catch { return []; } },
  pushLog: entry  => {
    try {
      const log = store.getLog();
      log.unshift({ ...entry, ts: new Date().toISOString() });
      localStorage.setItem(SK_LOG, JSON.stringify(log.slice(0, 300)));
    } catch {}
  },
  getSession:  () => { try { return JSON.parse(sessionStorage.getItem(SK_SESSION) || 'null'); } catch { return null; } },
  setSession:  u  => { try { sessionStorage.setItem(SK_SESSION, JSON.stringify(u)); } catch {} },
  clearSession:() => { try { sessionStorage.removeItem(SK_SESSION); } catch {} },
};
