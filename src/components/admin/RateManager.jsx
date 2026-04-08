import { useState, useCallback, useRef, useEffect } from 'react';
import { useAdminData } from '../../utils/useAdminData';
import * as ds from '../../utils/adminDataStore';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const CODE_GROUPS = [
  'Evals',
  'Therapeutic',
  'Modalities',
  'Aquatic',
  'Strapping',
  'Dry Needling',
  'Wound Care',
  'Orthotic',
];

const PT_EVALS = ['EVAL-61', 'EVAL-62', 'EVAL-63', 'RE-EVAL-4'];
const OT_EVALS = ['EVAL-65', 'EVAL-66', 'EVAL-67', 'RE-EVAL-8'];
const ALL_EVALS = [...PT_EVALS, ...OT_EVALS];

const BRAND = '#FF8200';

/* ------------------------------------------------------------------ */
/*  Toast                                                             */
/* ------------------------------------------------------------------ */

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="toast" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Editable Cell                                                     */
/* ------------------------------------------------------------------ */

function EditableCell({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [dirty, setDirty] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(value ?? '');
    setDirty(false);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = useCallback(async () => {
    setEditing(false);
    const numeric = parseFloat(draft);
    if (isNaN(numeric)) {
      setDraft(value ?? '');
      return;
    }
    if (numeric !== value) {
      setDirty(true);
      await onSave(numeric);
    }
  }, [draft, value, onSave]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') {
      setDraft(value ?? '');
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        style={{
          width: 72,
          padding: '2px 4px',
          fontSize: 13,
          border: `2px solid ${BRAND}`,
          borderRadius: 4,
          outline: 'none',
          textAlign: 'right',
        }}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
      style={{
        display: 'inline-block',
        minWidth: 56,
        padding: '2px 6px',
        borderRadius: 4,
        cursor: 'pointer',
        textAlign: 'right',
        background: dirty ? `${BRAND}22` : 'transparent',
        border: dirty ? `1px solid ${BRAND}55` : '1px solid transparent',
        transition: 'background 0.3s',
      }}
      title="Click to edit"
    >
      {value !== null && value !== undefined ? `$${Number(value).toFixed(2)}` : '--'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Code Modal                                                    */
/* ------------------------------------------------------------------ */

function AddCodeForm({ payers, onAdd, onCancel }) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      // Build a payer-rate map with every payer set to 0
      const payerRates = {};
      payers.forEach((p) => {
        payerRates[p] = 0;
      });
      await ds.setRateBulk(trimmed, payerRates);
      if (description.trim()) {
        await ds.setCodeLabel(trimmed, description.trim());
      }
      onAdd();
    } catch (err) {
      setError(err.message || 'Failed to add code');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 16, padding: 16 }}>
      <h4 style={{ marginTop: 0 }}>Add New Code</h4>
      {error && <div className="alert-warning">{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="field-label">Code Key</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. THER-01"
            style={{ display: 'block', padding: '6px 8px', fontSize: 14 }}
            required
          />
        </div>
        <div>
          <label className="field-label">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Therapeutic Exercise"
            style={{ display: 'block', padding: '6px 8px', fontSize: 14, minWidth: 220 }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Add Code'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export default function RateManager({ user }) {
  const { loading, rates, payers, codeLabels, codeGroups } = useAdminData();
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  /* ---- derived data ---- */

  const allCodes = rates ? Object.keys(rates).sort() : [];

  // Build a reverse map: code -> group key
  const codeToGroup = {};
  (codeGroups || []).forEach(g => {
    (g.codes || []).forEach(c => { codeToGroup[c] = g.key; });
  });

  const filteredCodes = allCodes.filter((code) => {
    // search filter
    const label = codeLabels?.[code] || '';
    const haystack = `${code} ${label}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;

    // group filter
    if (!activeGroup) return true;
    if (activeGroup === 'Evals') return ALL_EVALS.includes(code);

    const group = codeToGroup[code];
    if (group && group.toLowerCase() === activeGroup.toLowerCase()) return true;

    return false;
  });

  const payerList = payers || [];

  /* ---- handlers ---- */

  const showToast = (msg) => setToast(msg);

  const handleCellSave = useCallback(
    async (code, payer, value) => {
      try {
        await ds.setRate(code, payer, value);
        setToast(`Saved ${code} / ${payer}: $${value.toFixed(2)}`);
      } catch (err) {
        setError(`Failed to save rate for ${code} / ${payer}: ${err.message}`);
      }
    },
    [],
  );

  const handleDeleteCode = useCallback(async (code) => {
    try {
      await ds.deleteRateCode(code);
      setConfirmDelete(null);
      showToast(`Deleted code ${code}`);
    } catch (err) {
      setError(`Failed to delete ${code}: ${err.message}`);
    }
  }, []);

  const handleAddDone = () => {
    setShowAdd(false);
    showToast('New code added successfully');
  };

  /* ---- render ---- */

  if (loading) {
    return <div style={{ padding: 32, textAlign: 'center' }}>Loading rate data...</div>;
  }

  return (
    <section>
      <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Reimbursement Rate Manager</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Cancel' : '+ Add Code'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="alert-warning" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Add code form */}
      {showAdd && <AddCodeForm payers={payerList} onAdd={handleAddDone} onCancel={() => setShowAdd(false)} />}

      {/* Search + Group filters */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', margin: '16px 0' }}>
        <input
          type="text"
          placeholder="Search codes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '6px 10px', fontSize: 14, minWidth: 200, borderRadius: 4, border: '1px solid #ccc' }}
        />

        <div className="group-pills" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className={`group-pill ${activeGroup === null ? 'active' : ''}`}
            onClick={() => setActiveGroup(null)}
            style={activeGroup === null ? { background: BRAND, color: '#fff', border: 'none' } : {}}
          >
            All
          </button>
          {CODE_GROUPS.map((g) => (
            <button
              key={g}
              className={`group-pill ${activeGroup === g ? 'active' : ''}`}
              onClick={() => setActiveGroup(activeGroup === g ? null : g)}
              style={activeGroup === g ? { background: BRAND, color: '#fff', border: 'none' } : {}}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <p style={{ margin: '8px 0 12px', fontSize: 13, color: '#666' }}>
        Showing <strong>{filteredCodes.length}</strong> of {allCodes.length} codes across{' '}
        <strong>{payerList.length}</strong> payers
      </p>

      {/* Rate table */}
      <div
        className="rate-table-wrap"
        style={{
          overflowX: 'auto',
          maxHeight: '70vh',
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: 6,
        }}
      >
        <table
          className="rate-table"
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            width: 'max-content',
            minWidth: '100%',
            fontSize: 13,
          }}
        >
          <thead>
            <tr>
              {/* Sticky code column header */}
              <th
                style={{
                  position: 'sticky',
                  left: 0,
                  top: 0,
                  zIndex: 3,
                  background: '#f5f5f5',
                  padding: '8px 12px',
                  borderBottom: '2px solid #ccc',
                  borderRight: '2px solid #ccc',
                  minWidth: 180,
                  textAlign: 'left',
                }}
              >
                Code
              </th>
              {/* Sticky header for actions */}
              <th
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  background: '#f5f5f5',
                  padding: '8px 8px',
                  borderBottom: '2px solid #ccc',
                  textAlign: 'center',
                  minWidth: 80,
                }}
              >
                Actions
              </th>
              {payerList.map((payer) => (
                <th
                  key={payer}
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: '#f5f5f5',
                    padding: '8px 10px',
                    borderBottom: '2px solid #ccc',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                    minWidth: 100,
                  }}
                >
                  {payer}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCodes.length === 0 && (
              <tr>
                <td
                  colSpan={payerList.length + 2}
                  style={{ padding: 24, textAlign: 'center', color: '#999' }}
                >
                  No codes match the current filters.
                </td>
              </tr>
            )}
            {filteredCodes.map((code, idx) => {
              const isEval = ALL_EVALS.includes(code);
              const rowBg = idx % 2 === 0 ? '#fff' : '#fafafa';
              return (
                <tr key={code}>
                  {/* Sticky code cell */}
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      background: rowBg,
                      padding: '6px 12px',
                      borderRight: '2px solid #ccc',
                      borderBottom: '1px solid #eee',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{code}</span>
                    {isEval && (
                      <span className="badge" style={{ marginLeft: 6, fontSize: 10 }}>
                        {PT_EVALS.includes(code) ? 'PT' : 'OT'}
                      </span>
                    )}
                    {codeLabels?.[code] && (
                      <div style={{ fontWeight: 400, fontSize: 11, color: '#888', marginTop: 2 }}>
                        {codeLabels[code]}
                      </div>
                    )}
                  </td>
                  {/* Actions */}
                  <td
                    style={{
                      background: rowBg,
                      padding: '6px 8px',
                      borderBottom: '1px solid #eee',
                      textAlign: 'center',
                    }}
                  >
                    {user?.role === 'superadmin' && (
                      <>
                        {confirmDelete === code ? (
                          <span style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteCode(code)}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn btn-sm btn-muted"
                              onClick={() => setConfirmDelete(null)}
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => setConfirmDelete(code)}
                            title={`Delete ${code}`}
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </td>
                  {/* Payer rate cells */}
                  {payerList.map((payer) => (
                    <td
                      key={payer}
                      style={{
                        background: rowBg,
                        padding: '4px 6px',
                        borderBottom: '1px solid #eee',
                        textAlign: 'right',
                      }}
                    >
                      <EditableCell
                        value={rates[code]?.[payer] ?? null}
                        onSave={(val) => handleCellSave(code, payer, val)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </section>
  );
}
