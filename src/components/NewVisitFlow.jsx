import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { encryptPHI, decryptPHI } from '../utils/crypto';
import { validatePatientName } from '../utils/validation';
import { useAdminData } from '../utils/useAdminData';
import { store } from '../utils/store';
import BillingAlerts from './BillingAlerts';

const TODAY = new Date().toISOString().split('T')[0];

export default function NewVisitFlow({ user }) {
  const {
    loading: dataLoading,
    rates: RATES,
    payers: PAYERS,
    providers: PROVIDERS_MAP,
    allProviders: ALL_PROVIDERS,
    codeLabels: CODE_LABELS,
    codeGroups: CODE_GROUPS,
  } = useAdminData();

  // ── Patient state ──────────────────────────────────────
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null); // full patient obj (decrypted)
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', payer: '', diagnosis: '' });

  // ── Visit details state ────────────────────────────────
  const [provider, setProvider] = useState('');
  const [payer, setPayer] = useState('');
  const [visitDate, setVisitDate] = useState(TODAY);
  const [notes, setNotes] = useState('');

  // ── Codes state ────────────────────────────────────────
  const [codes, setCodes] = useState([]);
  const [grp, setGrp] = useState('All');
  const [codeSearch, setCodeSearch] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // ── UI state ───────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [successAnim, setSuccessAnim] = useState(false);

  // ── Init provider default ──────────────────────────────
  useEffect(() => {
    if (ALL_PROVIDERS && ALL_PROVIDERS.length > 0 && !provider) {
      const match = ALL_PROVIDERS.find(p => p.name === user?.name);
      if (match) setProvider(match.name);
    }
  }, [ALL_PROVIDERS]);

  // ── Load patients ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      setPatientsLoading(true);
      const { data } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
      const decrypted = (data || []).map(p => ({
        ...p,
        name: decryptPHI(p.encrypted_name),
        notes: p.notes ? decryptPHI(p.notes) : '',
      }));
      setPatients(decrypted);
      setPatientsLoading(false);
    })();
  }, []);

  // ── Load templates ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      setTemplatesLoading(true);
      const { data } = await supabase
        .from('treatment_templates')
        .select('*')
        .order('name');
      setTemplates(data || []);
      setTemplatesLoading(false);
    })();
  }, []);

  // ── Provider info ──────────────────────────────────────
  const pInfo = useMemo(
    () => (ALL_PROVIDERS || []).find(p => p.name === provider) || null,
    [provider, ALL_PROVIDERS],
  );
  const isOT = pInfo?.isOT || false;

  // ── Code groups ────────────────────────────────────────
  const PT_EVALS = ['EVAL-61', 'EVAL-62', 'EVAL-63', 'RE-EVAL-4'];
  const OT_EVALS = ['EVAL-65', 'EVAL-66', 'EVAL-67', 'RE-EVAL-8'];

  const groups = useMemo(() => [
    { key: 'Evals', label: isOT ? 'OT Evals' : 'PT Evals', codes: isOT ? OT_EVALS : PT_EVALS },
    ...CODE_GROUPS,
  ], [isOT, CODE_GROUPS]);

  const visibleCodes = useMemo(() => {
    const src = grp === 'All'
      ? [...(isOT ? OT_EVALS : PT_EVALS), ...CODE_GROUPS.flatMap(g => g.codes)]
      : (groups.find(g => g.key === grp)?.codes || []);
    if (!codeSearch) return src;
    const t = codeSearch.toLowerCase();
    return src.filter(c =>
      c.toLowerCase().includes(t) || (CODE_LABELS[c] || '').toLowerCase().includes(t),
    );
  }, [grp, codeSearch, groups, isOT, CODE_LABELS, CODE_GROUPS]);

  // ── Total calculation ──────────────────────────────────
  const total = useMemo(() => {
    if (!payer || codes.length === 0) return 0;
    return codes.reduce((s, c) => s + ((RATES[c] || {})[payer] || 0), 0);
  }, [codes, payer, RATES]);

  // ── Patient search filter ──────────────────────────────
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return [];
    const q = patientSearch.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.payer || '').toLowerCase().includes(q) ||
      (p.diagnosis || '').toLowerCase().includes(q),
    ).slice(0, 8);
  }, [patientSearch, patients]);

  // ── Helpers ────────────────────────────────────────────
  const toggle = c => setCodes(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const selectPatient = p => {
    setSelectedPatient(p);
    setPatientSearch('');
    if (p.payer) setPayer(p.payer);
    if (p.provider) {
      const match = (ALL_PROVIDERS || []).find(pr => pr.name === p.provider);
      if (match) setProvider(match.name);
    }
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setPatientSearch('');
  };

  const handleAddNewPatient = async () => {
    const nameErr = validatePatientName(newPatient.name);
    if (nameErr) { alert(nameErr); return; }
    const payload = {
      encrypted_name: encryptPHI(newPatient.name.trim()),
      payer: newPatient.payer,
      diagnosis: newPatient.diagnosis,
    };
    const { data, error } = await supabase.from('patients').insert(payload).select().single();
    if (error) {
      alert('Failed to add patient: ' + error.message);
      return;
    }
    const added = {
      ...data,
      name: newPatient.name.trim(),
      notes: '',
    };
    setPatients(prev => [added, ...prev]);
    selectPatient(added);
    setShowNewPatient(false);
    setNewPatient({ name: '', payer: '', diagnosis: '' });
    showToast('Patient added');
  };

  const applyTemplate = t => {
    setCodes(t.codes || []);
    showToast(`"${t.name}" applied`);
  };

  // ── Save visit ─────────────────────────────────────────
  const logVisit = async () => {
    if (!selectedPatient) { alert('Please select a patient.'); return; }
    if (codes.length === 0) { alert('Please select at least one code.'); return; }
    if (!payer) { alert('Please select a payer.'); return; }

    setSaving(true);
    try {
      await supabase.from('billing_entries').insert({
        patient_name: encryptPHI(selectedPatient.name),
        codes: [...codes],
        payer,
        provider: provider || '',
        location: pInfo?.location || user?.location || '',
        total,
        visit_date: visitDate,
        notes: notes.trim() ? encryptPHI(notes.trim()) : '',
        entered_by: user?.username || 'unknown',
      });

      await store.pushLog({
        user: user?.username || 'unknown',
        action: 'log_visit',
        detail: `Visit logged — $${total.toFixed(2)}`,
      });

      // Success animation
      setSuccessAnim(true);
      setTimeout(() => {
        setSuccessAnim(false);
        // Reset form
        setSelectedPatient(null);
        setPatientSearch('');
        setCodes([]);
        setNotes('');
        setVisitDate(TODAY);
        setGrp('All');
        setCodeSearch('');
        showToast('Visit logged successfully');
      }, 1400);
    } catch (e) {
      alert('Failed to log visit: ' + e.message);
    }
    setSaving(false);
  };

  // ── Loading ────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
        Loading...
      </div>
    );
  }

  // ── Success overlay ────────────────────────────────────
  if (successAnim) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '4rem 2rem', textAlign: 'center',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: '#FF8200',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, animation: 'pulse 0.6s ease-out',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>
          Visit Logged
        </div>
        <div style={{ fontSize: 15, color: '#6b7280' }}>
          {selectedPatient?.name} -- ${total.toFixed(2)}
        </div>
        <style>{`@keyframes pulse { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }`}</style>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────
  return (
    <div>
      {toast && <div className="toast">{toast}</div>}

      {/* ================================================================
          SECTION 1: SELECT PATIENT
          ================================================================ */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: '50%', background: '#FF8200',
            color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
          }}>1</span>
          <span className="section-head" style={{ marginBottom: 0 }}>Select Patient</span>
        </div>

        {selectedPatient ? (
          <div className="card" style={{ borderColor: '#FF8200', borderWidth: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,130,0,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: '#FF8200', flexShrink: 0,
                }}>
                  {selectedPatient.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>
                    {selectedPatient.name}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {selectedPatient.payer && <span className="badge" style={{ fontSize: 11 }}>{selectedPatient.payer}</span>}
                    {selectedPatient.diagnosis && <span className="badge badge-muted" style={{ fontSize: 11 }}>{selectedPatient.diagnosis}</span>}
                  </div>
                </div>
              </div>
              <button className="btn btn-muted btn-sm" onClick={clearPatient}>Change</button>
            </div>
          </div>
        ) : (
          <div className="card-surface">
            <input
              placeholder="Search patients by name, payer, or diagnosis..."
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
              autoComplete="off"
              style={{ marginBottom: 8 }}
            />

            {patientsLoading && (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontSize: 14 }}>
                Loading patients...
              </div>
            )}

            {/* Search results */}
            {patientSearch.trim() && filteredPatients.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {filteredPatients.map(p => (
                  <div
                    key={p.id}
                    onClick={() => selectPatient(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      background: '#fff', borderRadius: 10, marginBottom: 4, cursor: 'pointer',
                      border: '1.5px solid #e5e7eb', transition: 'border-color 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#FF8200'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,130,0,0.10)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: '#FF8200', flexShrink: 0,
                    }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {[p.payer, p.diagnosis].filter(Boolean).join(' -- ') || 'No details'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {patientSearch.trim() && filteredPatients.length === 0 && !patientsLoading && (
              <div style={{ textAlign: 'center', padding: '0.75rem', color: '#9ca3af', fontSize: 14 }}>
                No patients found for "{patientSearch}"
              </div>
            )}

            {/* Add new patient toggle */}
            {!showNewPatient ? (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowNewPatient(true)}
                style={{ marginTop: 4 }}
              >
                + Add New Patient
              </button>
            ) : (
              <div style={{
                background: '#fff', border: '1.5px solid #FF8200', borderRadius: 12,
                padding: 14, marginTop: 6,
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#FF8200', marginBottom: 10 }}>
                  New Patient
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                  <div>
                    <label className="field-label">Patient Name *</label>
                    <input
                      autoFocus
                      placeholder="Jane Doe"
                      value={newPatient.name}
                      onChange={e => setNewPatient(f => ({ ...f, name: e.target.value }))}
                      autoComplete="off"
                    />
                  </div>
                  <div className="grid-2">
                    <div>
                      <label className="field-label">Payer</label>
                      <select
                        value={newPatient.payer}
                        onChange={e => setNewPatient(f => ({ ...f, payer: e.target.value }))}
                      >
                        <option value="">Select payer</option>
                        {PAYERS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Diagnosis</label>
                      <input
                        placeholder="e.g. M54.5 Low Back Pain"
                        value={newPatient.diagnosis}
                        onChange={e => setNewPatient(f => ({ ...f, diagnosis: e.target.value }))}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleAddNewPatient}>
                    Add Patient
                  </button>
                  <button className="btn btn-muted btn-sm" onClick={() => { setShowNewPatient(false); setNewPatient({ name: '', payer: '', diagnosis: '' }); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================
          SECTION 2: VISIT DETAILS
          ================================================================ */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: '50%',
            background: selectedPatient ? '#FF8200' : '#d1d5db',
            color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
          }}>2</span>
          <span className="section-head" style={{ marginBottom: 0 }}>Visit Details</span>
        </div>

        <div className="card-surface">
          <div className="grid-2" style={{ marginBottom: 10 }}>
            <div>
              <label className="field-label">Provider</label>
              <select value={provider} onChange={e => setProvider(e.target.value)}>
                <option value="">Select provider</option>
                {Object.entries(PROVIDERS_MAP).map(([loc, names]) => (
                  <optgroup key={loc} label={`-- ${loc} --`}>
                    {names.map(n => <option key={n} value={n}>{n}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Payer</label>
              <select value={payer} onChange={e => setPayer(e.target.value)}>
                <option value="">Select payer</option>
                {PAYERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div>
              <label className="field-label">Visit Date</label>
              <input
                type="date"
                value={visitDate}
                onChange={e => setVisitDate(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Notes (optional)</label>
              <input
                placeholder="Initial eval, follow-up, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Provider badges */}
          {pInfo && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <span className="badge" style={{ fontSize: 11 }}>{pInfo.location}</span>
              <span className="badge badge-muted" style={{ fontSize: 11 }}>{isOT ? 'Occupational Therapy' : 'Physical Therapy'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          SECTION 3: CODES
          ================================================================ */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: '50%',
            background: (selectedPatient && payer) ? '#FF8200' : '#d1d5db',
            color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
          }}>3</span>
          <span className="section-head" style={{ marginBottom: 0 }}>Codes</span>
        </div>

        {/* Template quick-select */}
        {!templatesLoading && templates.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.06em',
              textTransform: 'uppercase', marginBottom: 6,
            }}>
              Quick Templates
            </div>
            <div style={{
              display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch',
              paddingBottom: 4, scrollbarWidth: 'none',
            }}>
              {templates.map(t => {
                const isActive = t.codes && t.codes.length > 0 &&
                  t.codes.every(c => codes.includes(c)) && codes.length === t.codes.length;
                return (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className={`group-pill${isActive ? ' active' : ''}`}
                    title={t.description || t.diagnosis || ''}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Code search */}
        <input
          placeholder="Search codes by name or description..."
          value={codeSearch}
          onChange={e => setCodeSearch(e.target.value)}
          style={{ marginBottom: 10 }}
        />

        {/* Group pills */}
        <div className="group-pills">
          {[{ key: 'All', label: 'All Codes' }, ...groups].map(g => (
            <button
              key={g.key}
              className={`group-pill${grp === g.key ? ' active' : ''}`}
              onClick={() => setGrp(g.key)}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Code grid */}
        <div className="code-grid">
          {visibleCodes.map(code => {
            const rate = payer ? ((RATES[code] || {})[payer] ?? null) : null;
            const active = codes.includes(code);
            const covered = rate === null || rate > 0;
            return (
              <button
                key={code}
                className={`code-btn${active ? ' active' : ''}${!covered ? ' not-covered' : ''}`}
                onClick={() => toggle(code)}
              >
                <div className="code-btn-title">{code}</div>
                <div className="code-btn-desc">{(CODE_LABELS[code] || '').substring(0, 26)}</div>
                {payer && (
                  <div className={`code-btn-rate ${rate === null ? 'rate-gray' : rate > 0 ? 'rate-green' : 'rate-red'}`}>
                    {rate === null ? '--' : rate > 0 ? `$${rate.toFixed(2)}` : 'Not covered'}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected code chips */}
        {codes.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Selected ({codes.length})
              </span>
              <button
                onClick={() => setCodes([])}
                style={{
                  fontSize: 12, color: '#9ca3af', background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, textDecoration: 'underline',
                }}
              >
                Clear all
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {codes.map(c => (
                <span key={c} className="chip" onClick={() => toggle(c)}>
                  {c}
                  {payer && (RATES[c] || {})[payer] > 0 && (
                    <span style={{ opacity: 0.7, fontSize: 11, marginLeft: 2 }}>
                      ${((RATES[c] || {})[payer] || 0).toFixed(2)}
                    </span>
                  )}
                  <span style={{ opacity: 0.6, fontSize: 15, marginLeft: 2 }}>x</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          SECTION 4: SUMMARY & SAVE
          ================================================================ */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: '50%',
            background: (selectedPatient && payer && codes.length > 0) ? '#FF8200' : '#d1d5db',
            color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
          }}>4</span>
          <span className="section-head" style={{ marginBottom: 0 }}>Summary & Save</span>
        </div>

        {/* Billing optimization alerts */}
        {codes.length > 0 && payer && (
          <BillingAlerts
            codes={codes}
            payer={payer}
            rates={RATES}
            codeLabels={CODE_LABELS}
          />
        )}

        <div className="card" style={{
          borderColor: (selectedPatient && payer && codes.length > 0) ? '#FF8200' : '#e5e7eb',
          borderWidth: 2,
        }}>
          {/* Summary details */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: '1 1 45%', minWidth: 140 }}>
                <div className="field-label">Patient</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: selectedPatient ? '#1a1a1a' : '#d1d5db' }}>
                  {selectedPatient?.name || 'Not selected'}
                </div>
              </div>
              <div style={{ flex: '1 1 45%', minWidth: 140 }}>
                <div className="field-label">Provider</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: provider ? '#1a1a1a' : '#d1d5db' }}>
                  {provider || 'Not selected'}
                </div>
              </div>
              <div style={{ flex: '1 1 45%', minWidth: 140 }}>
                <div className="field-label">Payer</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: payer ? '#1a1a1a' : '#d1d5db' }}>
                  {payer || 'Not selected'}
                </div>
              </div>
              <div style={{ flex: '1 1 45%', minWidth: 140 }}>
                <div className="field-label">Date</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>
                  {visitDate}
                </div>
              </div>
            </div>

            {/* Code breakdown */}
            {codes.length > 0 && payer && (
              <div style={{ borderTop: '1.5px solid #e5e7eb', paddingTop: 12, marginBottom: 8 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.06em',
                  textTransform: 'uppercase', marginBottom: 8,
                }}>
                  Codes ({codes.length})
                </div>
                {codes.map(c => {
                  const amt = (RATES[c] || {})[payer] || 0;
                  return (
                    <div key={c} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '4px 0', fontSize: 14,
                    }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{c}</span>
                        <span style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {CODE_LABELS[c] || ''}
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: amt > 0 ? '#1a1a1a' : '#b71c1c', flexShrink: 0, marginLeft: 8 }}>
                        {amt > 0 ? `$${amt.toFixed(2)}` : 'N/C'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Total */}
          <div style={{
            background: '#f9f5f0', borderRadius: 12, padding: '16px 14px',
            textAlign: 'center', marginBottom: 16,
          }}>
            <div className="total-label">Expected Reimbursement</div>
            <div className="total-amount" style={{ color: total > 0 ? '#FF8200' : '#d1d5db' }}>
              ${total.toFixed(2)}
            </div>
          </div>

          {/* Log Visit button */}
          <button
            className="btn btn-primary btn-full"
            onClick={logVisit}
            disabled={saving || !selectedPatient || codes.length === 0 || !payer}
            style={{
              padding: '14px 20px', fontSize: 17,
              opacity: (!selectedPatient || codes.length === 0 || !payer) ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Log Visit'}
          </button>

          {/* Validation hints */}
          {(!selectedPatient || codes.length === 0 || !payer) && (
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: '#9ca3af' }}>
              {!selectedPatient ? 'Select a patient above' :
               !payer ? 'Choose a payer in Visit Details' :
               codes.length === 0 ? 'Add at least one billing code' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
