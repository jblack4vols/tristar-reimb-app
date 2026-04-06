import React, { useState, useEffect, useCallback } from 'react';
import { initMsal, msalLogin, msalLogout, getMsalAccount } from './authConfig';
import { store } from './utils/store';
import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import AdminShell from './components/AdminShell';
import UserShell from './components/UserShell';

const ADMIN_EMAILS = [
  'jordan@tristarpt.com',
  'jordan.black@tristarpt.com',
  'jblack4vols@gmail.com',
];

function isAdmin(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    initMsal().then(account => {
      if (account) {
        const u = {
          name: account.name || account.username,
          email: (account.username || '').toLowerCase(),
          role: isAdmin((account.username || '')) ? 'admin' : 'user',
        };
        setUser(u);
        store.setSession(u);
        store.pushLog({ action: 'login', user: u.email, detail: `${u.name} signed in` });
      }
      setLoading(false);
    });
  }, []);

  const handleLogin = useCallback(() => {
    msalLogin();
  }, []);

  const handleLogout = useCallback(() => {
    store.pushLog({ action: 'logout', user: user?.email, detail: `${user?.name} signed out` });
    store.clearSession();
    msalLogout();
  }, [user]);

  if (loading) {
    return (
      <div className="app-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="app-loading-spinner" style={{ width: 40, height: 40, border: '3px solid #eee', borderTopColor: '#FF8200', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ color: '#888', fontSize: 14 }}>Loading Tristar PT Calculator…</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-wrapper">
      <Header user={user} onLogout={handleLogout} />
      <main className="app-main">
        {user.role === 'admin' ? <AdminShell user={user} /> : <UserShell user={user} />}
      </main>
    </div>
  );
}
