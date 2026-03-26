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
import ProductivityTracker from './admin/ProductivityTracker';
import PayerComparison from './admin/PayerComparison';
import MonthlyReport from './admin/MonthlyReport';
import YearOverYear from './admin/YearOverYear';
import VisitHistory from './VisitHistory';
import PatientDirectory from './PatientDirectory';
import AuthTracker from './AuthTracker';
import TreatmentTemplates from './TreatmentTemplates';

const ALL = ['superadmin', 'admin'];

const TABS = [
  { k: 'dashboard',    label: 'Dashboard',       roles: ALL },
  { k: 'calc',         label: 'Calculator',      roles: ALL },
  { k: 'patients',     label: 'Patients',        roles: ALL },
  { k: 'auths',        label: 'Authorizations',  roles: ALL },
  { k: 'templates',    label: 'Templates',       roles: ALL },
  { k: 'visits',       label: 'Visit History',   roles: ALL },
  { k: 'productivity', label: 'Productivity',    roles: ALL },
  { k: 'rates',        label: 'Rates',           roles: ALL },
  { k: 'ratehistory',  label: 'Rate History',    roles: ALL },
  { k: 'payers',       label: 'Payers',          roles: ALL },
  { k: 'comparison',   label: 'Payer Compare',   roles: ALL },
  { k: 'providers',    label: 'Providers',       roles: ALL },
  { k: 'rules',        label: 'Rules',           roles: ALL },
  { k: 'report',       label: 'Monthly Report',  roles: ALL },
  { k: 'yoy',          label: 'Year over Year',  roles: ALL },
  { k: 'data',         label: 'Import/Export',   roles: ALL },
  { k: 'users',        label: 'Users',           roles: ALL },
  { k: 'combos',       label: 'Combos',          roles: ALL },
  { k: 'log',          label: 'Activity Log',    roles: ALL },
];

export default function AdminShell({ user, onLogout }) {
  const visibleTabs = TABS.filter(t => t.roles.includes(user.role));
  const [tab, setTab] = useState('dashboard');
  const badge = user.role === 'superadmin' ? 'Super Admin' : 'Admin';

  // When a template is applied, switch to Calculator tab and set codes
  const [templateCodes, setTemplateCodes] = useState(null);
  const applyTemplate = (codes) => { setTemplateCodes(codes); setTab('calc'); };

  // When a patient is selected from directory, switch to Calculator tab
  const [selectedPatient, setSelectedPatient] = useState('');
  const selectPatient = (name) => { setSelectedPatient(name); setTab('calc'); };

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

      {tab === 'dashboard'    && <Dashboard />}
      {tab === 'calc'         && <CalcView user={user} templateCodes={templateCodes} selectedPatient={selectedPatient} onClearTemplate={() => setTemplateCodes(null)} onClearPatient={() => setSelectedPatient('')} />}
      {tab === 'patients'     && <PatientDirectory user={user} onSelectPatient={selectPatient} />}
      {tab === 'auths'        && <AuthTracker user={user} />}
      {tab === 'templates'    && <TreatmentTemplates user={user} onApplyTemplate={applyTemplate} />}
      {tab === 'visits'       && <VisitHistory user={user} adminView={true} />}
      {tab === 'productivity' && <ProductivityTracker />}
      {tab === 'rates'        && <RateManager />}
      {tab === 'ratehistory'  && <RateHistory />}
      {tab === 'payers'       && <PayerManager />}
      {tab === 'comparison'   && <PayerComparison />}
      {tab === 'providers'    && <ProviderManager />}
      {tab === 'rules'        && <BillingRulesEditor />}
      {tab === 'report'       && <MonthlyReport />}
      {tab === 'yoy'          && <YearOverYear />}
      {tab === 'data'         && <DataExportImport user={user} />}
      {tab === 'users'        && <UserManager />}
      {tab === 'combos'       && <AdminCombos />}
      {tab === 'log'          && <ActivityLog />}
    </div>
  );
}
