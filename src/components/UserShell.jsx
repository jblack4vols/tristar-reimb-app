import { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import GroupedNav from './GroupedNav';
import Sidebar, { MobileBottomBar } from './Sidebar';
import GlobalSearch from './GlobalSearch';
import FeatureRequests from './FeatureRequests';
import OnboardingTour from './OnboardingTour';
import HomePage from './HomePage';
import NewVisitFlow from './NewVisitFlow';
import BatchVisitEntry from './BatchVisitEntry';
import CalcView from './CalcView';
import UserCombos from './UserCombos';
import VisitHistory from './VisitHistory';
import PatientDirectory from './PatientDirectory';
import AuthTracker from './AuthTracker';
import TreatmentTemplates from './TreatmentTemplates';
import { supabase } from '../utils/supabase';
import { decryptPHI } from '../utils/crypto';

export default function UserShell({ user, onLogout }) {
  const [tab, setTab] = useState('home');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('trc_onboarding_done'));

  const [templateCodes, setTemplateCodes] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState('');
  const applyTemplate = (codes) => { setTemplateCodes(codes); setTab('calc'); };
  const selectPatient = (name) => { setSelectedPatient(name); setTab('calc'); };

  const [recentPatients, setRecentPatients] = useState([]);
  useEffect(() => {
    supabase.from('billing_entries').select('patient_name').eq('entered_by', user.username).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => {
        const names = [...new Set((data || []).map(e => decryptPHI(e.patient_name)).filter(Boolean))].slice(0, 5);
        setRecentPatients(names);
      });
  }, [tab]);

  const handleKeyboard = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); setTab('newvisit'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); setTab('patients'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); setTab('batch'); }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  const searchNavigate = (tabKey) => { setTab(tabKey); setSearchOpen(false); };

  return (
    <>
      {showOnboarding && (
        <OnboardingTour
          onComplete={() => setShowOnboarding(false)}
          onNavigate={(t) => { setTab(t); setShowOnboarding(false); }}
        />
      )}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={searchNavigate} />

      <div className="app-layout">
        <Sidebar activeTab={tab} onTabChange={setTab} isAdmin={false} onSearchClick={() => setSearchOpen(true)} />
        <div className="app-main">
          <div className="app-wrap">
            <Header user={user} onLogout={onLogout} badge={user.location || 'Staff'} onSearchClick={() => setSearchOpen(true)} />
            <GroupedNav activeTab={tab} onTabChange={setTab} isAdmin={false} />

            {tab === 'home'      && <HomePage user={user} onNavigate={setTab} recentPatients={recentPatients} />}
            {tab === 'calc'      && <CalcView user={user} templateCodes={templateCodes} selectedPatient={selectedPatient} onClearTemplate={() => setTemplateCodes(null)} onClearPatient={() => setSelectedPatient('')} />}
            {tab === 'newvisit'  && <NewVisitFlow user={user} />}
            {tab === 'batch'     && <BatchVisitEntry user={user} />}
            {tab === 'patients'  && <PatientDirectory user={user} onSelectPatient={selectPatient} />}
            {tab === 'auths'     && <AuthTracker user={user} />}
            {tab === 'templates' && <TreatmentTemplates user={user} onApplyTemplate={applyTemplate} />}
            {tab === 'visits'    && <VisitHistory user={user} />}
            {tab === 'combos'    && <UserCombos user={user} />}
            {tab === 'feedback'  && <FeatureRequests user={user} />}
          </div>
        </div>
        <MobileBottomBar activeTab={tab} onTabChange={setTab} isAdmin={false} onSearchClick={() => setSearchOpen(true)} />
      </div>
    </>
  );
}
