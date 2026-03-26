import { useState } from 'react';
import Header from './Header';
import CalcView from './CalcView';
import UserManager from './UserManager';
import AdminCombos from './AdminCombos';
import ActivityLog from './ActivityLog';
import RateManager from './admin/RateManager';
import PayerManager from './admin/PayerManager';
import ProviderManager from './admin/ProviderManager';
import BillingRulesEditor from './admin/BillingRulesEditor';
import DataExportImport from './admin/DataExportImport';

const TABS = [
  { k: 'calc',      label: 'Calculator' },
  { k: 'rates',     label: 'Rates' },
  { k: 'payers',    label: 'Payers' },
  { k: 'providers', label: 'Providers' },
  { k: 'rules',     label: 'Rules' },
  { k: 'data',      label: 'Import/Export' },
  { k: 'users',     label: 'Users' },
  { k: 'combos',    label: 'Combos' },
  { k: 'log',       label: 'Activity Log' },
];

export default function AdminShell({ user, onLogout }) {
  const [tab, setTab] = useState('calc');

  return (
    <div className="app-wrap">
      <Header user={user} onLogout={onLogout} badge="Super Admin" />

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

      {tab === 'calc'      && <CalcView user={user} />}
      {tab === 'rates'     && <RateManager />}
      {tab === 'payers'    && <PayerManager />}
      {tab === 'providers' && <ProviderManager />}
      {tab === 'rules'     && <BillingRulesEditor />}
      {tab === 'data'      && <DataExportImport user={user} />}
      {tab === 'users'     && <UserManager />}
      {tab === 'combos'    && <AdminCombos />}
      {tab === 'log'       && <ActivityLog />}
    </div>
  );
}
