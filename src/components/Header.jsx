import { useState, useEffect } from 'react';

const LOGO = 'https://assets.cdn.filesafe.space/4OhLjdxKCuBxvgs4TpUU/media/6630c406f4d5b72faba066f0.jpeg';

export default function Header({ user, onLogout, badge, onSearchClick }) {
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
          onError={e => { e.target.style.opacity = '0'; }}
        />
        <div>
          <div className="header-org">Tristar Physical Therapy</div>
          <div className="header-title">Reimbursement Calculator</div>
        </div>
      </div>

      <div className="header-right">
        <div className="header-badge">{badge}</div>
        <div className="header-name">{user.name}</div>
        {onSearchClick && (
          <button className="header-signout" onClick={onSearchClick} style={{ marginRight: 4 }} title="Search (Ctrl+K)" aria-label="Open search">
            \uD83D\uDD0D
          </button>
        )}
        <button className="header-signout" onClick={toggleTheme} style={{ marginRight: 4 }} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
        </button>
        <button className="header-signout" onClick={onLogout} aria-label="Sign out">
          Sign out
        </button>
      </div>
    </div>
  );
}
