import { useState } from 'react';
import Header from './Header';
import CalcView from './CalcView';
import UserCombos from './UserCombos';

const TABS = [
  { k: 'calc',   label: 'Calculator' },
  { k: 'combos', label: 'My Combos' },
];

export default function UserShell({ user, onLogout }) {
  const [tab, setTab] = useState('calc');

  return (
    <div className="app-wrap">
      <Header user={user} onLogout={onLogout} badge={user.location || 'Staff'} />

      <nav className="nav-tabs">
        {TABS.map(t => (
          <button
            key={t.k}
            className={`nav-tab${tab === t.k ? ' active' : ''}`}
            onClick={() => setTab(t.k)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'calc'   && <CalcView user={user} />}
      {tab === 'combos' && <UserCombos user={user} />}
    </div>
  );
}
