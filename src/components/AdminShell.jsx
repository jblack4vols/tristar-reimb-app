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
import RateHistory from './admin/RateHistory';
import Dashboard from './admin/Dashboard';
import VisitHistory from './VisitHistory';

const TABS = [
  { k: 'dashboard',   label: 'Dashboard',      roles: ['superadmin', 'admin'] },
  { k: 'calc',        label: 'Calculator',     roles: ['superadmin', 'admin'] },
  { k: 'visits',      label: 'Visit History',  roles: ['superadmin', 'admin'] },
  { k: 'rates',       label: 'Rates',          roles: ['superadmin', 'admin'] },
  { k: 'ratehistory', label: 'Rate History',    roles: ['superadmin', 'admin'] },
  { k: 'payers',      label: 'Payers',         roles: ['superadmin'] },
  { k: 'providers',   label: 'Providers',      roles: ['superadmin'] },
  { k: 'rules',       label: 'Rules',          roles: ['superadmin'] },
  { k: 'data',        label: 'Import/Export',  roles: ['superadmin'] },
  { k: 'users',       label: 'Users',          roles: ['superadmin'] },
  { k: 'combos',      label: 'Combos',         roles: ['superadmin', 'admin'] },
  { k: 'log',         label: 'Activity Log',   roles: ['superadmin', 'admin'] },
];

export default function AdminShell({ user, onLogout }) {
  const visibleTabs = TABS.filter(t => t.roles.includes(user.role));
  const [tab, setTab] = useState('dashboard');
  const badge = user.role === 'superadmin' ? 'Super Admin' : 'Admin';

  return (
    <div className="app-wrap">
      <Header user={user} onLogout={onLogout} badge={badge} />

      <nav className="nav-tabs">
        {visibleTabs.map(t => (
          <button
            key={t.k}
            className={`nav-tab${tab === t.k ? ' active' : ''}`}
            onClick={() => setTab(t.k)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && <Dashboard />}
      {tab === 'calc'      && <CalcView user={user} />}
      {tab === 'visits'    && <VisitHistory user={user} adminView={true} />}
      {tab === 'rates'     && <RateManager />}
      {tab === 'ratehistory' && <RateHistory />}
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
