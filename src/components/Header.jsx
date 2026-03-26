import { useState, useEffect } from 'react';

const LOGO = 'https://tristarpt.com/wp-content/uploads/2021/01/tristar-logo.png';

export default function Header({ user, onLogout, badge }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('trc_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('trc_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="app-header">
      <div className="header-left">
        <img
          src={LOGO}
          alt="Tristar Physical Therapy"
          className="header-logo"
          onError={e => { e.target.style.display = 'none'; }}
        />
        <div>
          <div className="header-org">Tristar Physical Therapy</div>
          <div className="header-title">Reimbursement Calculator</div>
        </div>
      </div>

      <div className="header-right">
        <div className="header-badge">{badge}</div>
        <div className="header-name">{user.name}</div>
        <button className="header-signout" onClick={toggleTheme} style={{ marginRight: 4 }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className="header-signout" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
