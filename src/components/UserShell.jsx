import React, { useState } from 'react';
import CalcView from './CalcView';
import UserCombos from './UserCombos';

const TABS = [
  { key: 'calc', label: 'Calculator' },
  { key: 'combos', label: 'My Combos' },
];

export default function UserShell({ user }) {
  const [tab, setTab] = useState('calc');

  return (
    <>
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'calc' && <CalcView user={user} />}
      {tab === 'combos' && <UserCombos user={user} />}
    </>
  );
}
