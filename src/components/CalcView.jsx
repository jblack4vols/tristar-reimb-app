import { useState, useEffect, useMemo, useRef } from 'react';
import { useAdminData } from '../utils/useAdminData';
import { PT_EVALS as DEFAULT_PT_EVALS, OT_EVALS as DEFAULT_OT_EVALS } from '../data/codes';
import { store } from '../utils/store';
import { supabase } from '../utils/supabase';
import { encryptPHI } from '../utils/crypto';
import EightMinuteRule from './EightMinuteRule';
import BillingAlerts from './BillingAlerts';
import PdfExport from './PdfExport';
import { getOptimizationSuggestions } from '../utils/billingOptimizer';
import { getMissingCodeSuggestions } from '../utils/codeSuggestions';

export default function CalcView({ user, templateCodes, selectedPatient, onClearTemplate, onClearPatient }) {
  const { loading: dataLoading, rates: RATES, payers: PAYERS, contractPayers: CONTRACT_PAYERS,
    billingRules: BILLING_RULES, codeLabels: CODE_LABELS, codeGroups: CODE_GROUPS,
    providers: PROVIDERS_MAP, allProviders: ALL_PROVIDERS, getSetting } = useAdminData();
  const PT_EVALS = DEFAULT_PT_EVALS;
  const OT_EVALS = DEFAULT_OT_EVALS;
  const autoSuggestEnabled = getSetting('auto_suggest_codes', true);
  const [mode, setMode]               = useState('fee');
  // Default provider to logged-in user's name if they're a provider
  const [provider, setProvider]       = useState(() => {
    const match = (ALL_PROVIDERS || []).find(p => p.name === user.name);
    return match ? match.name : '';
  });
  const [payer, setPayer]             = useState('');
  const [codes, setCodes]             = useState([]);
  const [search, setSearch]           = useState('');
  const [grp, setGrp]                 = useState('Evals');
  const [cPayer, setCPayer]           = useState('');
  const [visits, setVisits]           = useState(1);
  const [showSave, setShowSave]       = useState(false);
  const [comboName, setComboName]     = useState('');
  const [toast, setToast]             = useState('');
  const [projVisits, setProjVisits]   = useState(1);
  const [visitsPerWeek, setVisitsPerWeek] = useState(0);
  const [showLogVisit, setShowLogVisit] = useState(false);
  const [patientName, setPatientName]   = useState('');
  const [visitNotes, setVisitNotes]     = useState('');
  const [logSaving, setLogSaving]       = useState(false);
  const toastTimer = useRef(null);

  // Apply template codes when passed from Templates tab
  useEffect(() => {
    if (templateCodes && templateCodes.length > 0) {
      setCodes(templateCodes);
      onClearTemplate?.();
      showToast('Template applied!');
    }
  }, [templateCodes]);

  // Cleanup toast timer on unmount
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Apply selected patient name when passed from Patient Directory
  useEffect(() => {
    if (selectedPatient) {
      setPatientName(selectedPatient);
      setShowLogVisit(true);
      onClearPatient?.();
    }
  }, [selectedPatient]);

  const showToast = msg => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  };

  const logVisit = async () => {
    if (!patientName.trim()) { alert('Patient name is required.'); return; }
    setLogSaving(true);
    try {
      const savedName = patientName.trim();
      const pInfo = ALL_PROVIDERS.find(p => p.name === provider) || null;
      // Encrypt PHI before storing in database
      await supabase.from('billing_entries').insert({
        patient_name: encryptPHI(savedName),
        codes: [...codes],
        payer: mode === 'fee' ? payer : cPayer,
        provider: provider || '',
        location: pInfo?.location || user.location || '',
        total,
        visit_date: new Date().toISOString().split('T')[0],
        notes: encryptPHI(visitNotes.trim()),
        entered_by: user.username,
      });
      // Do NOT log patient name in activity log — HIPAA
      await store.pushLog({ user: user.username, action: 'log_visit', detail: `Visit logged — $${total.toFixed(2)}` });
      setPatientName('');
      setVisitNotes('');
      setShowLogVisit(false);
      showToast(`Visit logged for ${savedName}`);
    } catch (e) { alert('Failed to log visit: ' + e.message); }
    setLogSaving(false);
  };

  const pInfo  = useMemo(() => (ALL_PROVIDERS || []).find(p => p.name === provider) || null, [provider, ALL_PROVIDERS]);
  const discipline = pInfo?.discipline || 'PT';
  const isOT   = discipline === 'OT' || discipline === 'COTA';

  const groups = useMemo(() => [
    { key: 'Evals', label: isOT ? 'OT Evals (OT/COTA)' : 'PT Evals (PT/PTA)', codes: isOT ? OT_EVALS : PT_EVALS },
    ...(CODE_GROUPS || []),
  ], [isOT, CODE_GROUPS]);

  const visibleCodes = useMemo(() => {
    const src = grp === 'All'
      ? [...(isOT ? OT_EVALS : PT_EVALS), ...(CODE_GROUPS || []).flatMap(g => g.codes || [])]
      : (groups.find(g => g.key === grp)?.codes || []);
    if (!search) return src;
    const t = search.toLowerCase();
    return src.filter(c => c.toLowerCase().includes(t) || (CODE_LABELS[c] || '').toLowerCase().includes(t));
  }, [grp, search, groups, isOT]);

  const total = useMemo(() => {
    if (mode === 'contract') return (CONTRACT_PAYERS[cPayer] || 0) * visits;
    if (!payer) return 0;
    return codes.reduce((s, c) => s + ((RATES[c] || {})[payer] || 0), 0);
  }, [codes, payer, mode, cPayer, visits]);

  const rules      = BILLING_RULES[payer] || [];
  const notCovered = useMemo(() =>
    payer && mode === 'fee' ? codes.filter(c => ((RATES[c] || {})[payer] || 0) === 0) : [],
    [codes, payer, mode]
  );

  const suggestions = useMemo(() =>
    getOptimizationSuggestions(codes, payer, RATES),
    [codes, payer, RATES]
  );

  // Auto-suggest missing codes
  const [historicalEntries, setHistoricalEntries] = useState([]);
  useEffect(() => {
    supabase.from('billing_entries').select('codes').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => setHistoricalEntries(data || []));
  }, []);

  const missingSuggestions = useMemo(() => {
    if (!autoSuggestEnabled || codes.length === 0 || mode !== 'fee') return [];
    return getMissingCodeSuggestions(codes, RATES, payer, historicalEntries);
  }, [codes, payer, RATES, historicalEntries, autoSuggestEnabled, mode]);

  const toggle = c => setCodes(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  const favCodes = useMemo(() => {
    if (!provider) return [];
    const combos = store.getCombos().filter(cb => cb.provider === provider);
    if (!combos.length) return [];
    const freq = {};
    combos.forEach(cb => (cb.codes || []).forEach(c => { freq[c] = (freq[c] || 0) + 1; }));
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c]) => c);
  }, [provider]);

  const saveCombo = async () => {
    const n = comboName.trim();
    if (!n || !codes.length) return;
    const all = store.getCombos();
    const nc = {
      id: `c_${Date.now()}`,
      name: n,
      codes: [...codes],
      payer,
      provider,
      owner: user.name,
      ownerId: user.id || user.username,
      savedAt: new Date().toISOString(),
    };
    await store.setCombos([...all, nc]);
    await store.pushLog({ user: user.username, action: 'save_combo', detail: `"${n}"` });
    setComboName('');
    setShowSave(false);
    showToast(`"${n}" saved!`);
  };

  if (dataLoading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading rates...</div>;

  return (
    <div>
      {toast && <div className="toast">{toast}</div>}

      {/* Getting started guide — show only when nothing selected */}
      {!payer && codes.length === 0 && mode === 'fee' && (
        <div className="card" style={{ borderColor: '#FF8200', borderWidth: 2, marginBottom: 16, background: 'linear-gradient(135deg, #fff9f3 0%, #fff 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>$</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a', marginBottom: 6 }}>
                Maximize Your Reimbursement
              </div>
              <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                <strong>1.</strong> Select your <strong>provider</strong> to see discipline-specific codes<br />
                <strong>2.</strong> Choose the <strong>payer/insurance</strong> to see their rates<br />
                <strong>3.</strong> Add <strong>billing codes</strong> and the calculator shows your expected reimbursement<br />
                <strong>4.</strong> Check the <strong>green optimization tips</strong> for ways to bill more
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="mode-toggle">
        {[{ m: 'fee', label: 'Fee Schedule' }, { m: 'contract', label: 'Contract / Day Rate' }].map(({ m, label }) => (
          <button key={m} className={`mode-btn${mode === m ? ' active' : ''}`} onClick={() => setMode(m)}>{label}</button>
        ))}
      </div>

      {/* Provider + Payer */}
      <div className="grid-2" style={{ marginBottom: 8 }}>
        <div>
          <label className="field-label">Provider</label>
          <select value={provider} onChange={e => { setProvider(e.target.value); setGrp('Evals'); }}>
            <option value="">All providers</option>
            {Object.entries(PROVIDERS_MAP).map(([loc, names]) => (
              <optgroup key={loc} label={`— ${loc} —`}>
                {names.map(n => <option key={n} value={n}>{n}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">{mode === 'fee' ? 'Insurance / Payer' : 'Contract Payer'}</label>
          {mode === 'fee'
            ? <select value={payer} onChange={e => setPayer(e.target.value)}>
                <option value="">Select payer</option>
                {PAYERS.map(p => <option key={p}>{p}</option>)}
              </select>
            : <select value={cPayer} onChange={e => setCPayer(e.target.value)}>
                <option value="">Select payer</option>
                {Object.entries(CONTRACT_PAYERS).map(([p, r]) => (
                  <option key={p} value={p}>{p} — ${r}/visit</option>
                ))}
              </select>
          }
        </div>
      </div>

      {/* Provider badges */}
      {pInfo && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <span className="badge">{pInfo.location}</span>
          <span className="badge-muted badge">{
            discipline === 'OT' ? 'Occupational Therapist (OT)' :
            discipline === 'COTA' ? 'Certified OT Assistant (COTA)' :
            discipline === 'PTA' ? 'Physical Therapist Assistant (PTA)' :
            'Physical Therapist (PT)'
          }</span>
        </div>
      )}

      {/* Favorite codes — Quick Picks */}
      {favCodes.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Quick Pick
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {favCodes.map(c => (
              <span
                key={c}
                className="chip"
                onClick={() => toggle(c)}
                style={{
                  cursor: 'pointer',
                  background: codes.includes(c) ? '#FF8200' : undefined,
                  color: codes.includes(c) ? '#fff' : undefined,
                }}
              >
                ⭐ {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Billing rules */}
      {rules.length > 0 && (
        <div className="alert-warning">
          <div style={{ fontWeight: 700, fontSize: 13, color: '#78480f', marginBottom: 6 }}>
            Billing Rules — {payer}
          </div>
          {rules.map((r, i) => (
            <div key={i} style={{ fontSize: 13, color: '#5c3a0a', lineHeight: 1.6 }}>⚠ {r}</div>
          ))}
        </div>
      )}

      {mode === 'fee' ? (
        <>
          {/* Search */}
          <input
            placeholder="Search codes by name or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 10 }}
          />

          {/* Group pills */}
          <div className="group-pills" role="tablist" aria-label="Code groups">
            {[{ key: 'All', label: 'All Codes' }, ...groups].map(g => (
              <button
                key={g.key}
                role="tab"
                aria-selected={grp === g.key}
                className={`group-pill${grp === g.key ? ' active' : ''}`}
                onClick={() => setGrp(g.key)}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Code grid */}
          <div className="code-grid" role="group" aria-label="Billing codes">
            {visibleCodes.map(code => {
              const rate   = payer ? ((RATES[code] || {})[payer] ?? null) : null;
              const active = codes.includes(code);
              const covered = rate === null || rate > 0;
              return (
                <button
                  key={code}
                  className={`code-btn${active ? ' active' : ''}${!covered ? ' not-covered' : ''}`}
                  onClick={() => toggle(code)}
                  aria-pressed={active}
                  aria-label={`${code} ${CODE_LABELS[code] || ''} ${rate !== null ? (rate > 0 ? `$${rate.toFixed(2)}` : 'Not covered') : ''}`}
                >
                  <div className="code-btn-title">{code}</div>
                  <div className="code-btn-desc">{(CODE_LABELS[code] || '').substring(0, 26)}</div>
                  {payer && (
                    <div className={`code-btn-rate ${rate === null ? 'rate-gray' : rate > 0 ? 'rate-green' : 'rate-red'}`}>
                      {rate === null ? '—' : rate > 0 ? `$${rate.toFixed(2)}` : 'Not covered'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Save combo + Log Visit */}
          {codes.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {!showSave && !showLogVisit
                ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowSave(true)}>★ Save Combo</button>
                    {(payer || cPayer) && total > 0 && (
                      <button className="btn btn-primary btn-sm" onClick={() => setShowLogVisit(true)}>Log Visit</button>
                    )}
                    {payer && (
                      <PdfExport
                        codes={codes}
                        payer={payer}
                        provider={provider}
                        total={total}
                        rates={RATES}
                        codeLabels={CODE_LABELS}
                      />
                    )}
                  </div>
                : showSave
                ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      autoFocus
                      placeholder="Name this combo…"
                      value={comboName}
                      onChange={e => setComboName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveCombo()}
                      style={{ flex: 1, minWidth: 160, borderColor: '#FF8200' }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={saveCombo}>Save</button>
                    <button className="btn btn-muted btn-sm" onClick={() => setShowSave(false)}>Cancel</button>
                  </div>
                : <div className="card" style={{ borderColor: '#FF8200', borderWidth: 2 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#FF8200', marginBottom: 12 }}>Log Patient Visit</div>
                    <div className="grid-2" style={{ marginBottom: 10 }}>
                      <div>
                        <label className="field-label">Patient Name *</label>
                        <input
                          autoFocus
                          placeholder="John Doe"
                          value={patientName}
                          onChange={e => setPatientName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && logVisit()}
                        />
                      </div>
                      <div>
                        <label className="field-label">Notes (optional)</label>
                        <input
                          placeholder="Initial eval, follow-up, etc."
                          value={visitNotes}
                          onChange={e => setVisitNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                      <strong>{mode === 'fee' ? payer : cPayer}</strong> · {codes.length} code{codes.length !== 1 ? 's' : ''} · <strong style={{ color: '#FF8200' }}>${total.toFixed(2)}</strong>
                      {provider && <span> · {provider}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={logVisit} disabled={logSaving}>
                        {logSaving ? 'Saving…' : 'Log Visit'}
                      </button>
                      <button className="btn btn-muted btn-sm" onClick={() => setShowLogVisit(false)}>Cancel</button>
                    </div>
                  </div>
              }
            </div>
          )}

          {/* Smart Billing Alerts */}
          {codes.length > 0 && payer && (
            <BillingAlerts
              codes={codes}
              payer={payer}
              rates={RATES}
              codeLabels={CODE_LABELS}
            />
          )}

          {/* Optimization Suggestions — help staff maximize reimbursement */}
          {suggestions.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {suggestions.map((s) => (
                <div key={s.code} className="optimization-tip">
                  <span className="optimization-tip-icon">$</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                      +${s.difference.toFixed(2)} more with {s.suggestion}
                    </div>
                    <div>{s.hint}</div>
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        setCodes(p => [...p.filter(c => c !== s.code), s.suggestion]);
                      }}
                      style={{
                        marginTop: 8, padding: '5px 12px', fontSize: 12,
                        background: '#16a34a', color: '#fff', border: 'none',
                        borderRadius: 6, cursor: 'pointer', fontWeight: 700,
                      }}
                    >
                      Switch {s.code} to {s.suggestion}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Auto-suggest missing codes */}
          {missingSuggestions.length > 0 && (
            <div className="card" style={{ borderColor: '#16a34a', borderWidth: 2, marginBottom: 14, background: 'linear-gradient(135deg, #f0fdf4 0%, #fff 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>$</span>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#16a34a' }}>
                  Missing Codes — You Could Be Billing More
                </div>
              </div>
              {missingSuggestions.map(s => (
                <div key={s.code} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  padding: '10px 0', borderBottom: '1px solid rgba(22,163,74,0.12)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>
                      {s.code} <span style={{ fontWeight: 400, fontSize: 12, color: '#6b7280' }}>{CODE_LABELS[s.code] || ''}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#15803d', marginTop: 2, lineHeight: 1.4 }}>
                      {s.reason}
                    </div>
                    {s.estimatedAmount > 0 && (
                      <div style={{ fontSize: 12, color: '#FF8200', fontWeight: 700, marginTop: 2 }}>
                        +${s.estimatedAmount.toFixed(2)} for {payer}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-sm"
                    onClick={() => setCodes(p => [...p, s.code])}
                    style={{
                      background: '#16a34a', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 13,
                      whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(22,163,74,0.25)',
                    }}
                  >
                    + Add
                  </button>
                </div>
              ))}
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                Based on common billing patterns and your visit history.
              </div>
            </div>
          )}

          {/* Result card */}
          <div className={codes.length > 0 && payer && total > 0 ? 'revenue-card' : 'card-surface'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <div className="total-label">Expected Reimbursement</div>
                <div className="total-amount" style={{ color: codes.length > 0 && payer && total > 0 ? undefined : '#9ca3af' }}>
                  ${total.toFixed(2)}
                </div>
                {!payer && codes.length === 0 && (
                  <div style={{ fontSize: 14, color: '#9ca3af', marginTop: 6 }}>Select a payer and add codes above.</div>
                )}
                {!payer && codes.length > 0 && (
                  <div style={{ fontSize: 14, color: '#9ca3af', marginTop: 6 }}>Select a payer to see rates.</div>
                )}
              </div>
              {(payer || codes.length > 0) && (() => {
                const isRevCard = codes.length > 0 && payer && total > 0;
                return (
                  <div style={{ textAlign: 'right', fontSize: 13, color: isRevCard ? 'rgba(255,255,255,0.7)' : '#6b7280', lineHeight: 1.8, flexShrink: 0, marginLeft: 12 }}>
                    {payer && <div style={{ fontWeight: 700, color: isRevCard ? '#fff' : undefined }}>{payer}</div>}
                    {codes.length > 0 && <div>{codes.length} code{codes.length !== 1 ? 's' : ''}</div>}
                    {codes.length > 0 && (
                      <button
                        onClick={() => setCodes([])}
                        style={{ fontSize: 12, color: isRevCard ? 'rgba(255,255,255,0.6)' : '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Not covered warning */}
            {notCovered.length > 0 && (
              <div className="alert-danger">
                Not covered by {payer}: <strong>{notCovered.join(', ')}</strong>
              </div>
            )}

            {/* Breakdown */}
            {codes.length > 0 && payer && (() => {
              const isRevCard = total > 0;
              return (
                <div style={{ borderTop: `1.5px solid ${isRevCard ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}`, marginTop: 12, paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isRevCard ? 'rgba(255,255,255,0.6)' : '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Line-item breakdown
                  </div>
                  {codes.map(c => {
                    const amt = (RATES[c] || {})[payer] || 0;
                    return (
                      <div key={c} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: `1px solid ${isRevCard ? 'rgba(255,255,255,0.1)' : '#f3f4f6'}`, gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: isRevCard ? '#fff' : '#1a1a1a' }}>{c}</span>
                          <span style={{ fontSize: 13, color: isRevCard ? 'rgba(255,255,255,0.6)' : '#6b7280', display: 'block', lineHeight: 1.3 }}>{CODE_LABELS[c]}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, flexShrink: 0, color: isRevCard ? (amt > 0 ? '#fff' : '#fca5a5') : (amt > 0 ? '#1a1a1a' : '#b71c1c') }}>
                          {amt > 0 ? `$${amt.toFixed(2)}` : 'Not covered'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Code chips */}
            {codes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {codes.map(c => (
                  <span key={c} className="chip" onClick={() => toggle(c)}>
                    {c} <span style={{ opacity: 0.7, fontSize: 15 }}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 8-Minute Rule */}
          <EightMinuteRule codes={codes} />

          {/* Multi-Visit Projections */}
          {codes.length > 0 && payer && total > 0 && (
            <div className="card-surface" style={{ marginTop: 14 }}>
              <div className="field-label" style={{ marginBottom: 10, fontSize: 14 }}>Multi-Visit Projections</div>

              <div className="grid-2" style={{ marginBottom: 14 }}>
                <div>
                  <label className="field-label">Number of Visits</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    inputMode="numeric"
                    value={projVisits}
                    onChange={e => setProjVisits(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                  />
                </div>
                <div>
                  <label className="field-label">Visits per Week</label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    inputMode="numeric"
                    value={visitsPerWeek}
                    onChange={e => setVisitsPerWeek(Math.max(0, Math.min(7, parseInt(e.target.value) || 0)))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div className="total-label">Per Visit</div>
                  <div className="total-amount" style={{ color: '#FF8200' }}>
                    ${total.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="total-label">Projected Total ({projVisits} visit{projVisits !== 1 ? 's' : ''})</div>
                  <div className="total-amount" style={{ color: '#FF8200' }}>
                    ${(total * projVisits).toFixed(2)}
                  </div>
                </div>
              </div>

              {visitsPerWeek > 0 && (
                <div style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 14, paddingTop: 14, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div className="total-label">Weekly ({visitsPerWeek}×/wk)</div>
                    <div className="total-amount" style={{ color: '#FF8200' }}>
                      ${(total * visitsPerWeek).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="total-label">Monthly (×4.33 wks)</div>
                    <div className="total-amount" style={{ color: '#FF8200' }}>
                      ${(total * visitsPerWeek * 4.33).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Contract mode */
        <>
          <div style={{ maxWidth: 200, marginBottom: 14 }}>
            <label className="field-label">Number of Visits</label>
            <input
              type="number" min="1" inputMode="numeric"
              value={visits}
              onChange={e => setVisits(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div className="card-surface">
            <div className="total-label">Expected Reimbursement</div>
            <div className="total-amount" style={{ color: total > 0 ? '#FF8200' : '#9ca3af' }}>
              ${total.toFixed(2)}
            </div>
            {cPayer && (
              <div style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
                <strong>{cPayer}</strong> · {visits} visit{visits !== 1 ? 's' : ''} · <strong>${CONTRACT_PAYERS[cPayer]}</strong>/visit
              </div>
            )}
          </div>
        </>
      )}

      {/* Reminders */}
      <div className="reminders">
        <div className="reminders-title">Quick Billing Reminders</div>
        {[
          { b: 'E-Stim (ES / 97014)',       n: 'Use G0283 instead for Medicare and all Medicare Advantage plans.' },
          { b: 'Strapping & Dry Needling',   n: 'No modifier on any code beginning with 2 when billing Medicare.' },
          { b: 'Aetna plans',                n: 'TA and MT cannot appear on the same claim.' },
          { b: '$0.00 rate shown',           n: 'Code is not covered or not contracted — do not bill.' },
        ].map(({ b, n }, i) => (
          <div key={i} className="reminder-item">
            <strong style={{ color: '#1a1a1a' }}>{b}:</strong> {n}
          </div>
        ))}
      </div>
    </div>
  );
}
