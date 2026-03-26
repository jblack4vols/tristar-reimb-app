import { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { initMsal, msalLogout } from './authConfig';
import { store, loadStore } from './utils/store';
import { loadAllData } from './utils/adminDataStore';
import LoginScreen from './components/LoginScreen';
import AdminShell from './components/AdminShell';
import UserShell from './components/UserShell';

const SUPER_ADMIN_PW_HASH = bcrypt.hashSync('Tristar2025!', 10);

const SUPER_ADMIN = {
  id: 'sa_jordan',
  username: 'jordan',
  password: SUPER_ADMIN_PW_HASH,
  name: 'Jordan Black',
  role: 'superadmin',
};

function resolveMsUser(account) {
  const users = store.getUsers();
  const email = account.username?.toLowerCase() || '';
  const matched = users.find(u =>
    u.email?.toLowerCase() === email ||
    u.username?.toLowerCase() === email.split('@')[0]
  );
  if (matched) return { ...matched, msAccount: true };
  const prefix = email.split('@')[0];
  if (prefix === 'jordan' || prefix === 'jblack' || prefix === 'jordanblack') {
    return { ...SUPER_ADMIN, msAccount: true, name: account.name || SUPER_ADMIN.name };
  }
  return {
    id: `ms_${account.localAccountId}`,
    username: prefix,
    name: account.name || account.username,
    role: 'staff',
    active: true,
    msAccount: true,
    email,
  };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginErr, setLoginErr]       = useState('');
  const [loginForm, setLoginForm]     = useState({ username: '', password: '' });
  const [ready, setReady]             = useState(false);
  const [isOffline, setIsOffline]     = useState(!navigator.onLine);

  // Offline detection
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline  = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  // HIPAA: Auto-logout after 15 minutes of inactivity
  useEffect(() => {
    if (!currentUser) return;
    const TIMEOUT = 15 * 60 * 1000; // 15 minutes
    const WARNING = 13 * 60 * 1000; // 13 minutes (warn 2 min before)
    let logoutTimer;
    let warningTimer;
    const resetTimer = () => {
      clearTimeout(logoutTimer);
      clearTimeout(warningTimer);
      setShowTimeoutWarning(false);
      warningTimer = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, WARNING);
      logoutTimer = setTimeout(async () => {
        await store.pushLog({ user: currentUser?.username, action: 'auto_logout', detail: 'Inactivity timeout (15 min)' });
        store.clearSession();
        setCurrentUser(null);
        setShowTimeoutWarning(false);
        setLoginForm({ username: '', password: '' });
        alert('You have been signed out due to 15 minutes of inactivity.');
      }, TIMEOUT);
    };
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(logoutTimer);
      clearTimeout(warningTimer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [currentUser]);

  useEffect(() => {
    // Load all data from Supabase in parallel with MSAL init
    // Timeout after 8s so the app doesn't hang forever
    const timeout = new Promise(resolve => setTimeout(() => resolve('timeout'), 8000));

    const msalPromise = initMsal().catch(err => { console.error('MSAL init error:', err); return null; });
    const storePromise = loadStore().catch(err => console.error('Store load error:', err));
    const dataPromise = loadAllData().catch(err => console.error('Data load error:', err));

    Promise.race([
      Promise.all([storePromise, dataPromise, msalPromise]),
      timeout,
    ]).then(async (result) => {
      setReady(true);
      if (result === 'timeout') {
        console.warn('App init timed out — loading with cached/default data');
        const sess = store.getSession();
        if (sess) setCurrentUser(sess);
        return;
      }
      const [, , account] = result;
      if (account) {
        const msUser = resolveMsUser(account);
        store.setSession(msUser);
        await store.pushLog({ user: msUser.username, action: 'login', detail: 'Microsoft SSO' });
        setCurrentUser(msUser);
      } else {
        const sess = store.getSession();
        if (sess) setCurrentUser(sess);
      }
    });
  }, []);

  const login = async () => {
    const { username, password } = loginForm;
    // Super admin check
    if (
      username.toLowerCase() === SUPER_ADMIN.username &&
      bcrypt.compareSync(password, SUPER_ADMIN_PW_HASH)
    ) {
      store.setSession(SUPER_ADMIN);
      await store.pushLog({ user: SUPER_ADMIN.username, action: 'login', detail: 'Super admin' });
      setCurrentUser(SUPER_ADMIN);
      setLoginErr('');
      return;
    }
    // Regular user check (from Supabase cache)
    const users = store.getUsers();
    const u = users.find(
      u =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.active &&
        bcrypt.compareSync(password, u.password)
    );
    if (u) {
      store.setSession(u);
      await store.pushLog({ user: u.username, action: 'login', detail: u.location || '' });
      setCurrentUser(u);
      setLoginErr('');
    } else {
      await store.pushLog({ user: username, action: 'login_fail' });
      setLoginErr('Incorrect username or password, or your account is inactive.');
    }
  };

  const logout = async () => {
    await store.pushLog({ user: currentUser?.username, action: 'logout' });
    store.clearSession();
    setCurrentUser(null);
    setLoginForm({ username: '', password: '' });
    if (currentUser?.msAccount) {
      try { await msalLogout(); } catch (e) { console.error(e); }
    }
  };

  const offlineBanner = isOffline ? (
    <div style={{ position: 'sticky', top: 0, zIndex: 999, background: '#fbbf24', color: '#78480f', padding: 8, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>
      You're offline — showing cached data
    </div>
  ) : null;

  const timeoutBanner = showTimeoutWarning ? (
    <div style={{ position: 'sticky', top: 0, zIndex: 999, background: '#fbbf24', color: '#78480f', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 700 }}>
      <span>You'll be signed out in 2 minutes due to inactivity</span>
      <button
        onClick={() => { setShowTimeoutWarning(false); window.dispatchEvent(new Event('mousedown')); }}
        style={{ background: '#78480f', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 700 }}
      >
        Stay Signed In
      </button>
    </div>
  ) : null;

  if (!ready) {
    return (
      <>
        {offlineBanner}
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#f5f5f5' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #eee', borderTopColor: '#FF8200', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</div>
        </div>
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        {offlineBanner}
        <LoginScreen
          form={loginForm}
          setForm={setLoginForm}
          onLogin={login}
          err={loginErr}
        />
      </>
    );
  }

  // Admin role: superadmin OR users with role 'admin'
  if (currentUser.role === 'superadmin' || currentUser.role === 'admin') {
    return <>{offlineBanner}{timeoutBanner}<AdminShell user={currentUser} onLogout={logout} /></>;
  }

  return <>{offlineBanner}{timeoutBanner}<UserShell user={currentUser} onLogout={logout} /></>;
}
