import { useState } from 'react';
import { msalLogin } from '../authConfig';
import { store } from '../utils/store';

const LOGO = 'https://tristarpt.com/wp-content/uploads/2021/01/tristar-logo.png';

const MsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

export default function LoginScreen({ form, setForm, onLogin, err }) {
  const [screen, setScreen]       = useState('login'); // login | forgot
  const [fpUser, setFpUser]       = useState('');
  const [fpDone, setFpDone]       = useState(false);
  const [msLoading, setMsLoading] = useState(false);

  const handleMsLogin = async () => {
    setMsLoading(true);
    try {
      await msalLogin();
    } catch (e) {
      console.error('MS login error:', e);
      setMsLoading(false);
    }
  };

  const submitForgot = async () => {
    if (!fpUser.trim()) return;
    await store.pushLog({ user: fpUser, action: 'forgot_password', detail: 'Reset requested via login screen' });
    setFpDone(true);
  };

  /* ── Forgot password screen ── */
  if (screen === 'forgot') {
    return (
      <div className="login-page">
        <div className="login-box">
          <div className="login-logo">
            <img
              src={LOGO}
              alt="Tristar Physical Therapy"
              onError={e => { e.target.style.display = 'none'; }}
            />
            <div className="login-title">Forgot Password</div>
            <div className="login-sub">
              Enter your username and your administrator will be notified to reset your password.
            </div>
          </div>

          <div className="card">
            {!fpDone ? (
              <>
                <label className="field-label">Username</label>
                <input
                  style={{ marginBottom: 14 }}
                  placeholder="Your username"
                  value={fpUser}
                  onChange={e => setFpUser(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  onKeyDown={e => e.key === 'Enter' && submitForgot()}
                />
                <button className="btn btn-primary btn-full" onClick={submitForgot}>
                  Request Password Reset
                </button>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button
                    onClick={() => setScreen('login')}
                    style={{ background: 'none', border: 'none', color: '#FF8200', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    ← Back to sign in
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 44, marginBottom: 12, color: '#FF8200' }}>✓</div>
                  <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Request submitted!</div>
                  <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Your administrator has been notified and will reset your password and send you new credentials shortly.
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-full"
                  onClick={() => { setScreen('login'); setFpDone(false); setFpUser(''); }}
                >
                  Back to sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Main login screen ── */
  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <img
            src={LOGO}
            alt="Tristar Physical Therapy"
            onError={e => { e.target.style.display = 'none'; }}
          />
          <div className="login-title">Reimbursement Calculator</div>
          <div className="login-sub">Sign in to continue</div>
        </div>

        <div className="card">
          {/* Microsoft SSO button */}
          <button
            className="ms-btn"
            onClick={handleMsLogin}
            disabled={msLoading}
          >
            <MsIcon />
            {msLoading ? 'Redirecting to Microsoft…' : 'Sign in with Microsoft 365'}
          </button>

          {/* Divider */}
          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">or sign in with username</span>
            <div className="divider-line" />
          </div>

          {/* Username */}
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">Username</label>
            <input
              placeholder="Enter your username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && onLogin()}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && onLogin()}
              autoComplete="current-password"
            />
          </div>

          {/* Error */}
          {err && (
            <div className="alert-danger" style={{ marginBottom: 14 }}>
              {err}
            </div>
          )}

          {/* Sign in */}
          <button className="btn btn-primary btn-full" onClick={onLogin}>
            Sign In
          </button>

          {/* Forgot password */}
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button
              onClick={() => setScreen('forgot')}
              style={{ background: 'none', border: 'none', color: '#FF8200', fontWeight: 700, fontSize: 13, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
            >
              Forgot password?
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
          Contact your administrator if you need access.
        </div>
      </div>
    </div>
  );
}
