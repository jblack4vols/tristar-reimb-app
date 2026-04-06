import React from 'react';

export default function Header({ user, onLogout }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-brand-icon">T</div>
          <span>Tristar PT Calc</span>
        </div>
        <div className="header-right">
          <span className="header-user">{user.name}</span>
          <span className="header-role">{user.role}</span>
          <button className="btn-logout" onClick={onLogout}>Sign Out</button>
        </div>
      </div>
    </header>
  );
}
