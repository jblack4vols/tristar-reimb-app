import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Header from './Header';
import GroupedNav from './GroupedNav';
import Sidebar, { MobileBottomBar } from './Sidebar';
import HomePage from './HomePage';
import ViewErrorBoundary from './ViewErrorBoundary';
import { supabase } from '../utils/supabase';
import { decryptPHI } from '../utils/crypto';
import { loadAdminData } from '../utils/adminDataStore';

// Lazy-loaded overlays — only needed on demand
const GlobalSearch = lazy(() => import('./GlobalSearch'));
const OnboardingTour = lazy(() => import('./OnboardingTour'));

// Core views — used by most sessions
const CalcView = lazy(() => import('./CalcView'));
const NewVisitFlow = lazy(() => import('./NewVisitFlow'));
const BatchVisitEntry = lazy(() => import('./BatchVisitEntry'));
const PatientDirectory = lazy(() => import('./PatientDirectory'));
const VisitHistory = lazy(() => import('./VisitHistory'));
const TreatmentTemplates = lazy(() => import('./TreatmentTemplates'));
const FeatureRequests = lazy(() => import('./FeatureRequests'));
const QuickStartGuide = lazy(() => import('./QuickStartGuide'));

// Admin-only views — lazy loaded
const UserManager = lazy(() => import('./UserManager'));
const AdminCombos = lazy(() => import('./AdminCombos'));
const ActivityLog = lazy(() => import('./ActivityLog'));
const RateManager = lazy(() => import('./admin/RateManager'));
const PayerManager = lazy(() => import('./admin/PayerManager'));
const ProviderManager = lazy(() => import('./admin/ProviderManager'));
const BillingRulesEditor = lazy(() => import('./admin/BillingRulesEditor'));
const DataExportImport = lazy(() => import('./admin/DataExportImport'));
const DataBackup = lazy(() => import('./admin/DataBackup'));
const RateHistory = lazy(() => import('./admin/RateHistory'));
const Dashboard = lazy(() => import('./admin/Dashboard'));
const ProductivityTracker = lazy(() => import('./admin/ProductivityTracker'));
const PayerComparison = lazy(() => import('./admin/PayerComparison'));
const MonthlyReport = lazy(() => import('./admin/MonthlyReport'));
const YearOverYear = lazy(() => import('./admin/YearOverYear'));
const DevGuide = lazy(() => import('./admin/DevGuide'));
const PayerNegotiation = lazy(() => import('./admin/PayerNegotiation'));
const RateChangeLog = lazy(() => import('./admin/RateChangeLog'));
const PayerMixReport = lazy(() => import('./admin/PayerMixReport'));
const CodeUtilization = lazy(() => import('./admin/CodeUtilization'));
const FeatureSettings = lazy(() => import('./admin/FeatureSettings'));

const ViewLoader = () => (
  <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
    <div style={{ width: 32, height: 32, border: '3px solid #eee', borderTopColor: '#FF8200', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
    Loading...
  </div>
);

export default function AdminShell({ user, onLogout }) {
  const [tab, setTab] = useState('home');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('trc_onboarding_done'));
  const badge = user.role === 'superadmin' ? 'Super Admin' : 'Admin';

  // Load admin-only data (billing rules, code labels, code groups) on mount
  useEffect(() => { loadAdminData(); }, []);

  const [templateCodes, setTemplateCodes] = useState(null);
  const applyTemplate = (codes) => { setTemplateCodes(codes); setTab('calc'); };

  const [selectedPatient, setSelectedPatient] = useState('');
  const selectPatient = (name) => { setSelectedPatient(name); setTab('calc'); };

  // Recent patients
  const [recentPatients, setRecentPatients] = useState([]);
  useEffect(() => {
    supabase.from('billing_entries').select('patient_name').eq('entered_by', user.username).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => {
        const names = [...new Set((data || []).map(e => decryptPHI(e.patient_name)).filter(Boolean))].slice(0, 5);
        setRecentPatients(names);
      });
  }, [user.username]);

  // Keyboard shortcuts
  const handleKeyboard = useCallback((e) => {
    // Ctrl/Cmd + K → search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    // Ctrl/Cmd + N → new visit
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); setTab('newvisit'); }
    // Ctrl/Cmd + P → patients
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); setTab('patients'); }
    // Ctrl/Cmd + B → batch entry
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); setTab('batch'); }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  const searchNavigate = (tabKey) => { setTab(tabKey); setSearchOpen(false); };

  return (
    <>
      <Suspense fallback={null}>
        {showOnboarding && (
          <OnboardingTour
            onComplete={() => setShowOnboarding(false)}
            onNavigate={(t) => { setTab(t); setShowOnboarding(false); }}
          />
        )}
        <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={searchNavigate} />
      </Suspense>

      <div className="app-layout">
        <Sidebar activeTab={tab} onTabChange={setTab} isAdmin={true} onSearchClick={() => setSearchOpen(true)} onLogout={onLogout} userName={user.name} />
        <div className="app-main">
          <div className="app-wrap">
            <Header user={user} onLogout={onLogout} badge={badge} onSearchClick={() => setSearchOpen(true)} />
            <GroupedNav activeTab={tab} onTabChange={setTab} isAdmin={true} />

            {tab === 'home' && <HomePage user={user} onNavigate={setTab} recentPatients={recentPatients} />}
            <ViewErrorBoundary name={tab} key={tab}>
              <Suspense fallback={<ViewLoader />}>
                {tab === 'guide'        && <QuickStartGuide />}
                {tab === 'dashboard'    && <Dashboard />}
                {tab === 'calc'         && <CalcView user={user} templateCodes={templateCodes} selectedPatient={selectedPatient} onClearTemplate={() => setTemplateCodes(null)} onClearPatient={() => setSelectedPatient('')} />}
                {tab === 'newvisit'     && <NewVisitFlow user={user} />}
                {tab === 'batch'        && <BatchVisitEntry user={user} />}
                {tab === 'patients'     && <PatientDirectory user={user} onSelectPatient={selectPatient} />}
                {tab === 'templates'    && <TreatmentTemplates user={user} onApplyTemplate={applyTemplate} />}
                {tab === 'visits'       && <VisitHistory user={user} adminView={true} />}
                {tab === 'productivity' && <ProductivityTracker />}
                {tab === 'rates'        && <RateManager user={user} />}
                {tab === 'ratehistory'  && <RateHistory />}
                {tab === 'payers'       && <PayerManager user={user} />}
                {tab === 'comparison'   && <PayerComparison />}
                {tab === 'providers'    && <ProviderManager />}
                {tab === 'rules'        && <BillingRulesEditor />}
                {tab === 'report'       && <MonthlyReport />}
                {tab === 'yoy'          && <YearOverYear />}
                {tab === 'data'         && <DataExportImport user={user} />}
                {tab === 'backup'       && <DataBackup />}
                {tab === 'users'        && <UserManager user={user} />}
                {tab === 'combos'       && <AdminCombos user={user} />}
                {tab === 'log'          && <ActivityLog user={user} />}
                {tab === 'negotiation'  && <PayerNegotiation />}
                {tab === 'ratechanges'  && <RateChangeLog />}
                {tab === 'payermix'     && <PayerMixReport />}
                {tab === 'codegaps'     && <CodeUtilization />}
                {tab === 'settings'     && <FeatureSettings user={user} />}
                {tab === 'feedback'     && <FeatureRequests user={user} isAdmin={true} />}
                {tab === 'devguide'     && <DevGuide user={user} />}
              </Suspense>
            </ViewErrorBoundary>
          </div>
        </div>
        <MobileBottomBar activeTab={tab} onTabChange={setTab} isAdmin={true} onSearchClick={() => setSearchOpen(true)} />
      </div>
    </>
  );
}
