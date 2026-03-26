import { useState, useEffect } from 'react';
import { initMsal, msalLogout } from './authConfig';
import { store, loadStore } from './utils/store';
import { loadAllData } from './utils/adminDataStore';
import LoginScreen from './components/LoginScreen';
import AdminShell from './components/AdminShell';
import UserShell from './components/UserShell';

const SUPER_ADMIN = {
  id: 'sa_jordan',
  username: 'jordan',
  password: 'Tristar2025!',
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

  useEffect(() => {
    // Load all data from Supabase in parallel with MSAL init
    Promise.all([
      loadStore().catch(err => console.error('Store load error:', err)),
      loadAllData().catch(err => console.error('Data load error:', err)),
      initMsal().catch(err => { console.error('MSAL init error:', err); return null; }),
    ]).then(([, , account]) => {
      setReady(true);
      if (account) {
        const msUser = resolveMsUser(account);
        store.setSession(msUser);
        store.pushLog({ user: msUser.username, action: 'login', detail: 'Microsoft SSO' });
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
      password === SUPER_ADMIN.password
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
        u.password === password &&
        u.active
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

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#f5f5f5' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #eee', borderTopColor: '#FF8200', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        form={loginForm}
        setForm={setLoginForm}
        onLogin={login}
        err={loginErr}
      />
    );
  }

  // Admin role: superadmin OR users with role 'admin'
  if (currentUser.role === 'superadmin' || currentUser.role === 'admin') {
    return <AdminShell user={currentUser} onLogout={logout} />;
  }

  return <UserShell user={currentUser} onLogout={logout} />;
}
