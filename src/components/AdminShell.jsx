import React, { useState } from 'react';
import CalcView from './CalcView';
import UserManager from './UserManager';
import AdminCombos from './AdminCombos';
import ActivityLog from './ActivityLog';

const TABS = [
  { key: 'calc', label: 'Calculator' },
  { key: 'combos', label: 'Combos' },
  { key: 'users', label: 'Users' },
  { key: 'log', label: 'Activity' },
];

export default function AdminShell({ user }) {
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
      {tab === 'combos' && <AdminCombos user={user} />}
      {tab === 'users' && <UserManager user={user} />}
      {tab === 'log' && <ActivityLog />}
    </>
  );
}
