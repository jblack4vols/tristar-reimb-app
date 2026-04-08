import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { encryptPHI, decryptPHI } from '../utils/crypto';
import { useAdminData } from '../utils/useAdminData';
import { store } from '../utils/store';

const TODAY = new Date().toISOString().split('T')[0];

function makeBlankRow(defaultProvider) {
  return {
    id: crypto.randomUUID(),
    patientSearch: '',
    patient: null,
    payer: '',
    provider: defaultProvider || '',
    date: TODAY,
    codes: [],
    notes: '',
    codePickerOpen: false,
  };
}

export default function BatchVisitEntry({ user }) {
  const {
    loading: dataLoading,
    rates: RATES,
    payers: PAYERS,
    allProviders: ALL_PROVIDERS,
    codeLabels: CODE_LABELS,
    codeGroups: CODE_GROUPS,
  } = useAdminData();

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [successCount, setSuccessCount] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const defaultProvider = useMemo(() => {
    if (!ALL_PROVIDERS || ALL_PROVIDERS.length === 0) return '';
    const match = ALL_PROVIDERS.find(p => p.name === user?.name);
    return match ? match.name : '';
  }, [ALL_PROVIDERS, user]);

  // Init first row once provider default is known
  useEffect(() => {
    if (!dataLoading && rows.length === 0) {
      setRows([makeBlankRow(defaultProvider)]);
    }
  }, [dataLoading, defaultProvider]);

  // Load patients
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

  // All available codes
  const allCodes = useMemo(() => {
    return CODE_GROUPS.flatMap(g => g.codes);
  }, [CODE_GROUPS]);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  /* ───── Row helpers ───── */
  const updateRow = (id, patch) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    // Clear validation error for changed fields
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const addRow = () => {
    setRows(prev => [...prev, makeBlankRow(defaultProvider)]);
  };

  const removeRow = (id) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== id);
      return next.length === 0 ? [makeBlankRow(defaultProvider)] : next;
    });
  };

  /* ───── Patient search ───── */
  const getFilteredPatients = (query) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.payer || '').toLowerCase().includes(q)
    ).slice(0, 6);
  };

  const selectPatient = (rowId, patient) => {
    updateRow(rowId, {
      patient,
      patientSearch: '',
      payer: patient.payer || '',
    });
  };

  /* ───── Code toggle ───── */
  const toggleCode = (rowId, code) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const has = r.codes.includes(code);
      return { ...r, codes: has ? r.codes.filter(c => c !== code) : [...r.codes, code] };
    }));
  };

  const handleCodeInput = (rowId, text) => {
    const codes = text.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
    const valid = codes.filter(c => allCodes.includes(c) || Object.keys(RATES).includes(c));
    if (valid.length > 0) {
      setRows(prev => prev.map(r => {
        if (r.id !== rowId) return r;
        const merged = [...new Set([...r.codes, ...valid])];
        return { ...r, codes: merged };
      }));
    }
  };

  /* ───── Estimated reimbursement ───── */
  const getRowTotal = (row) => {
    if (!row.payer || row.codes.length === 0) return 0;
    return row.codes.reduce((s, c) => s + ((RATES[c] || {})[row.payer] || 0), 0);
  };

  const grandTotal = useMemo(() => {
    return rows.reduce((s, r) => s + getRowTotal(r), 0);
  }, [rows, RATES]);

  /* ───── Validation ───── */
  const validate = () => {
    const errors = {};
    let valid = true;
    rows.forEach(r => {
      const missing = [];
      if (!r.patient) missing.push('patient');
      if (!r.payer) missing.push('payer');
      if (r.codes.length === 0) missing.push('codes');
      if (missing.length > 0) {
        errors[r.id] = missing;
        valid = false;
      }
    });
    setValidationErrors(errors);
    return valid;
  };

  /* ───── Save all ───── */
  const logAllVisits = async () => {
    if (!validate()) return;
    setSaving(true);
    setSuccessCount(null);

    try {
      const inserts = rows.map(r => {
        const providerInfo = (ALL_PROVIDERS || []).find(p => p.name === r.provider);
        return {
          patient_name: encryptPHI(r.patient.name),
          codes: [...r.codes],
          payer: r.payer,
          provider: r.provider || '',
          location: providerInfo?.location || user?.location || '',
          total: getRowTotal(r),
          visit_date: r.date,
          notes: r.notes.trim() ? encryptPHI(r.notes.trim()) : '',
          entered_by: user?.username || 'unknown',
        };
      });

      const { error } = await supabase.from('billing_entries').insert(inserts);
      if (error) throw error;

      const totalAmt = inserts.reduce((s, i) => s + i.total, 0);
      await store.pushLog({
        user: user?.username || 'unknown',
        action: 'batch_visit_entry',
        detail: `Batch logged ${inserts.length} visit(s) -- $${totalAmt.toFixed(2)}`,
      });

      setSuccessCount(inserts.length);
      setRows([makeBlankRow(defaultProvider)]);
      setValidationErrors({});
      showToast(`${inserts.length} visit(s) logged successfully`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  /* ───── Loading ───── */
  if (dataLoading || patientsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      {toast && <div className="toast">{toast}</div>}

      <div className="card" style={{ maxWidth: 1100 }}>
        <h2 className="section-head">Batch Visit Entry</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, opacity: 0.7 }}>
          Log multiple visits at once. Add rows, fill in details, then submit all.
        </p>

        {successCount && (
          <div style={{
            background: 'rgba(255,130,0,0.08)',
            border: '1px solid #FF8200',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 14,
            color: '#FF8200',
            fontWeight: 600,
          }}>
            {successCount} visit(s) logged successfully.
          </div>
        )}

        {/* ── Table ── */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 16 }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 180 }}>Patient</th>
                <th style={{ minWidth: 130 }}>Payer</th>
                <th style={{ minWidth: 140 }}>Provider</th>
                <th style={{ minWidth: 120 }}>Date</th>
                <th style={{ minWidth: 200 }}>Codes</th>
                <th style={{ minWidth: 100 }}>Notes</th>
                <th style={{ minWidth: 80, textAlign: 'right' }}>Est. $</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowErrs = validationErrors[row.id] || [];
                const rowTotal = getRowTotal(row);

                return (
                  <tr key={row.id}>
                    {/* Patient */}
                    <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>
                      {row.patient ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontWeight: 600,
                            fontSize: 13,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 130,
                          }}>
                            {row.patient.name}
                          </span>
                          <button
                            className="btn btn-muted btn-sm"
                            style={{ padding: '1px 6px', fontSize: 11, lineHeight: 1.2 }}
                            onClick={() => updateRow(row.id, { patient: null, patientSearch: '' })}
                            title="Clear patient"
                          >
                            x
                          </button>
                        </div>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="Search patient..."
                            value={row.patientSearch}
                            onChange={e => updateRow(row.id, { patientSearch: e.target.value })}
                            autoComplete="off"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              fontSize: 13,
                              border: rowErrs.includes('patient') ? '2px solid #ef4444' : '1px solid #d1d5db',
                              borderRadius: 6,
                            }}
                          />
                          {row.patientSearch.trim().length > 0 && (() => {
                            const results = getFilteredPatients(row.patientSearch);
                            return (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                width: 240,
                                background: '#fff',
                                border: '1.5px solid #e5e7eb',
                                borderRadius: 10,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                zIndex: 9999,
                                maxHeight: 220,
                                overflow: 'auto',
                                marginTop: 4,
                              }}>
                                {results.length > 0 ? results.map(p => (
                                  <div
                                    key={p.id}
                                    onClick={() => selectPatient(row.id, p)}
                                    style={{
                                      padding: '8px 12px',
                                      cursor: 'pointer',
                                      fontSize: 13,
                                      borderBottom: '1px solid #f3f4f6',
                                      transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,130,0,0.06)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                    {p.payer && <span className="badge" style={{ fontSize: 10 }}>{p.payer}</span>}
                                  </div>
                                )) : (
                                  <div style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>
                                    No patients found
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </td>

                    {/* Payer */}
                    <td>
                      <select
                        value={row.payer}
                        onChange={e => updateRow(row.id, { payer: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          fontSize: 13,
                          border: rowErrs.includes('payer') ? '2px solid #ef4444' : '1px solid #d1d5db',
                          borderRadius: 4,
                        }}
                      >
                        <option value="">-- Payer --</option>
                        {(PAYERS || []).map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>

                    {/* Provider */}
                    <td>
                      <select
                        value={row.provider}
                        onChange={e => updateRow(row.id, { provider: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          fontSize: 13,
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                        }}
                      >
                        <option value="">-- Provider --</option>
                        {(ALL_PROVIDERS || []).map(p => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </td>

                    {/* Date */}
                    <td>
                      <input
                        type="date"
                        value={row.date}
                        onChange={e => updateRow(row.id, { date: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          fontSize: 13,
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                        }}
                      />
                    </td>

                    {/* Codes */}
                    <td style={{ padding: '6px 8px', verticalAlign: 'top', position: 'relative' }}>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 3,
                        marginBottom: row.codes.length > 0 ? 4 : 0,
                        border: rowErrs.includes('codes') ? '2px solid #ef4444' : 'none',
                        borderRadius: 4,
                        padding: rowErrs.includes('codes') ? 2 : 0,
                      }}>
                        {row.codes.map(c => (
                          <span className="chip" key={c} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 11,
                            padding: '2px 6px',
                          }}>
                            {c}
                            <span
                              style={{ cursor: 'pointer', fontWeight: 700, opacity: 0.6 }}
                              onClick={() => toggleCode(row.id, c)}
                            >x</span>
                          </span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-muted btn-sm"
                          style={{ fontSize: 11, padding: '2px 8px' }}
                          onClick={() => updateRow(row.id, { codePickerOpen: !row.codePickerOpen })}
                        >
                          {row.codePickerOpen ? 'Close' : '+ Codes'}
                        </button>
                        <input
                          type="text"
                          placeholder="e.g. 97110,97140"
                          style={{
                            flex: 1,
                            padding: '2px 6px',
                            fontSize: 12,
                            border: '1px solid #d1d5db',
                            borderRadius: 4,
                            minWidth: 80,
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleCodeInput(row.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                        />
                      </div>

                      {/* Mini code picker popup */}
                      {row.codePickerOpen && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          zIndex: 60,
                          background: '#fff',
                          border: '1px solid #d1d5db',
                          borderRadius: 8,
                          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                          padding: 10,
                          width: 280,
                          maxHeight: 260,
                          overflow: 'auto',
                        }}>
                          {CODE_GROUPS.map(group => (
                            <div key={group.key} style={{ marginBottom: 8 }}>
                              <div className="field-label" style={{ fontSize: 11, marginBottom: 4 }}>
                                {group.label}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                {group.codes.map(code => {
                                  const selected = row.codes.includes(code);
                                  return (
                                    <button
                                      key={code}
                                      onClick={() => toggleCode(row.id, code)}
                                      style={{
                                        padding: '2px 7px',
                                        fontSize: 11,
                                        border: selected ? '2px solid #FF8200' : '1px solid #d1d5db',
                                        borderRadius: 4,
                                        background: selected ? 'rgba(255,130,0,0.1)' : '#fff',
                                        color: selected ? '#FF8200' : '#374151',
                                        cursor: 'pointer',
                                        fontWeight: selected ? 700 : 400,
                                      }}
                                      title={CODE_LABELS[code] || code}
                                    >
                                      {code}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          <button
                            className="btn btn-muted btn-sm btn-full"
                            style={{ marginTop: 4, fontSize: 11 }}
                            onClick={() => updateRow(row.id, { codePickerOpen: false })}
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Notes */}
                    <td>
                      <input
                        type="text"
                        value={row.notes}
                        onChange={e => updateRow(row.id, { notes: e.target.value })}
                        placeholder="Notes..."
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          fontSize: 13,
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                        }}
                      />
                    </td>

                    {/* Est. Reimbursement */}
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#FF8200' }}>
                      ${rowTotal.toFixed(2)}
                    </td>

                    {/* Remove */}
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => removeRow(row.id)}
                        title="Remove row"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, paddingTop: 10 }}>
                  Grand Total:
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 16, color: '#FF8200', paddingTop: 10 }}>
                  ${grandTotal.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Validation summary */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="alert-danger" style={{ marginTop: 12, fontSize: 13 }}>
            Some rows are missing required fields (highlighted in red). Please fill in patient, payer, and at least one code for each row.
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-muted btn-sm" onClick={addRow}>
            + Add Row
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            {rows.length} row{rows.length !== 1 ? 's' : ''}
          </span>
          <button
            className="btn btn-primary"
            onClick={logAllVisits}
            disabled={saving || rows.length === 0}
          >
            {saving ? 'Saving...' : `Log All Visits (${rows.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
