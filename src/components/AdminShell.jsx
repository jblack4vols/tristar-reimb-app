import { useState, useEffect } from 'react';
import Header from './Header';
import GroupedNav from './GroupedNav';
import HomePage from './HomePage';
import NewVisitFlow from './NewVisitFlow';
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
import { supabase } from '../utils/supabase';
import { decryptPHI } from '../utils/crypto';

export default function AdminShell({ user, onLogout }) {
  const [tab, setTab] = useState('home');
  const badge = user.role === 'superadmin' ? 'Super Admin' : 'Admin';

  const [templateCodes, setTemplateCodes] = useState(null);
  const applyTemplate = (codes) => { setTemplateCodes(codes); setTab('calc'); };

  const [selectedPatient, setSelectedPatient] = useState('');
  const selectPatient = (name) => { setSelectedPatient(name); setTab('calc'); };

  // Recent patients for home page
  const [recentPatients, setRecentPatients] = useState([]);
  useEffect(() => {
    supabase.from('billing_entries').select('patient_name').order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => {
        const names = [...new Set((data || []).map(e => decryptPHI(e.patient_name)).filter(Boolean))].slice(0, 5);
        setRecentPatients(names);
      });
  }, [tab]);

  return (
    <div className="app-wrap">
      <Header user={user} onLogout={onLogout} badge={badge} />
      <GroupedNav activeTab={tab} onTabChange={setTab} isAdmin={true} />

      {tab === 'home'         && <HomePage user={user} onNavigate={setTab} recentPatients={recentPatients} />}
      {tab === 'dashboard'    && <Dashboard />}
      {tab === 'calc'         && <CalcView user={user} templateCodes={templateCodes} selectedPatient={selectedPatient} onClearTemplate={() => setTemplateCodes(null)} onClearPatient={() => setSelectedPatient('')} />}
      {tab === 'newvisit'     && <NewVisitFlow user={user} />}
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
