import { useState, useEffect } from 'react';
import Header from './Header';
import GroupedNav from './GroupedNav';
import HomePage from './HomePage';
import NewVisitFlow from './NewVisitFlow';
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

  return (
    <div className="app-wrap">
      <Header user={user} onLogout={onLogout} badge={user.location || 'Staff'} />
      <GroupedNav activeTab={tab} onTabChange={setTab} isAdmin={false} />

      {tab === 'home'      && <HomePage user={user} onNavigate={setTab} recentPatients={recentPatients} />}
      {tab === 'calc'      && <CalcView user={user} templateCodes={templateCodes} selectedPatient={selectedPatient} onClearTemplate={() => setTemplateCodes(null)} onClearPatient={() => setSelectedPatient('')} />}
      {tab === 'newvisit'  && <NewVisitFlow user={user} />}
      {tab === 'patients'  && <PatientDirectory user={user} onSelectPatient={selectPatient} />}
      {tab === 'auths'     && <AuthTracker user={user} />}
      {tab === 'templates' && <TreatmentTemplates user={user} onApplyTemplate={applyTemplate} />}
      {tab === 'visits'    && <VisitHistory user={user} />}
      {tab === 'combos'    && <UserCombos user={user} />}
    </div>
  );
}
