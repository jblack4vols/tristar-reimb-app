import { useState } from 'react';
import Header from './Header';
import CalcView from './CalcView';
import UserCombos from './UserCombos';
import VisitHistory from './VisitHistory';
import PatientDirectory from './PatientDirectory';
import AuthTracker from './AuthTracker';
import TreatmentTemplates from './TreatmentTemplates';

const TABS = [
  { k: 'calc',      label: 'Calculator' },
  { k: 'patients',  label: 'Patients' },
  { k: 'auths',     label: 'Authorizations' },
  { k: 'templates', label: 'Templates' },
  { k: 'visits',    label: 'My Visits' },
  { k: 'combos',    label: 'My Combos' },
];

export default function UserShell({ user, onLogout }) {
  const [tab, setTab] = useState('calc');
  const [templateCodes, setTemplateCodes] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState('');

  const applyTemplate = (codes) => { setTemplateCodes(codes); setTab('calc'); };
  const selectPatient = (name) => { setSelectedPatient(name); setTab('calc'); };

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

      {tab === 'calc'      && <CalcView user={user} templateCodes={templateCodes} selectedPatient={selectedPatient} onClearTemplate={() => setTemplateCodes(null)} onClearPatient={() => setSelectedPatient('')} />}
      {tab === 'patients'  && <PatientDirectory user={user} onSelectPatient={selectPatient} />}
      {tab === 'auths'     && <AuthTracker user={user} />}
      {tab === 'templates' && <TreatmentTemplates user={user} onApplyTemplate={applyTemplate} />}
      {tab === 'visits'    && <VisitHistory user={user} />}
      {tab === 'combos'    && <UserCombos user={user} />}
    </div>
  );
}
