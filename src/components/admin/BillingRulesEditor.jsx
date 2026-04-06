import { useState, useCallback } from 'react';
import { useAdminData } from '../../utils/useAdminData';
import * as ds from '../../utils/adminDataStore';

export default function BillingRulesEditor() {
  const { payers, billingRules } = useAdminData();

  const [selectedPayer, setSelectedPayer] = useState('');
  const [rules, setRules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  // When user picks a payer, load its rules into the editor
  const handlePayerChange = (payer) => {
    setSelectedPayer(payer);
    if (payer) {
      setRules([...(billingRules[payer] || [])]);
    } else {
      setRules([]);
    }
  };

  // ── Rule list manipulation ──────────────────────────────

  const updateRule = (index, value) => {
    const next = [...rules];
    next[index] = value;
    setRules(next);
  };

  const addRule = () => setRules([...rules, '']);

  const removeRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const moveRule = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= rules.length) return;
    const next = [...rules];
    [next[index], next[target]] = [next[target], next[index]];
    setRules(next);
  };

  // ── Save ────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedPayer) return;
    const cleaned = rules.map(r => r.trim()).filter(Boolean);
    setSaving(true);
    try {
      await ds.setPayerRules(selectedPayer, cleaned);
      setRules(cleaned);
      showToast(`Rules saved for ${selectedPayer}`);
    } catch (err) {
      showToast(`Error: ${err.message || 'Save failed'}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            background: toast.startsWith('Error') ? '#dc2626' : '#FF8200',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {toast}
        </div>
      )}

      <div className="section-head">Billing Rules Editor</div>

      {/* Payer selector */}
      <div className="card">
        <label className="field-label">Select Payer</label>
        <select
          value={selectedPayer}
          onChange={e => handlePayerChange(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
        >
          <option value="">-- Choose a payer --</option>
          {payers.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Rule editor */}
      {selectedPayer && (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label className="field-label" style={{ margin: 0 }}>
              Rules for <span style={{ color: '#FF8200' }}>{selectedPayer}</span>
            </label>
            <button className="btn btn-ghost btn-sm" onClick={addRule}>+ Add Rule</button>
          </div>

          {rules.length === 0 && (
            <div className="alert-warning" style={{ marginBottom: 12 }}>
              No rules defined for this payer. Click "Add Rule" to create one.
            </div>
          )}

          {rules.map((rule, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <span style={{ color: '#9ca3af', fontSize: 12, minWidth: 20, textAlign: 'right' }}>{i + 1}.</span>
              <input
                value={rule}
                onChange={e => updateRule(i, e.target.value)}
                placeholder="Enter billing rule or warning..."
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                }}
              />
              <button
                className="btn btn-muted btn-sm"
                onClick={() => moveRule(i, -1)}
                disabled={i === 0}
                title="Move up"
                style={{ padding: '4px 8px', fontSize: 13 }}
              >
                &#9650;
              </button>
              <button
                className="btn btn-muted btn-sm"
                onClick={() => moveRule(i, 1)}
                disabled={i === rules.length - 1}
                title="Move down"
                style={{ padding: '4px 8px', fontSize: 13 }}
              >
                &#9660;
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => removeRule(i)}
                title="Remove rule"
                style={{ padding: '4px 8px' }}
              >
                &times;
              </button>
            </div>
          ))}

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Rules'}
            </button>
            <button
              className="btn btn-muted"
              onClick={() => handlePayerChange(selectedPayer)}
              disabled={saving}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Read-only summary for all payers */}
      <div style={{ marginTop: 24 }}>
        <div className="section-head">All Payer Rules Summary</div>

        {payers.filter(p => (billingRules[p] || []).length > 0).length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: 15 }}>
            No billing rules have been defined for any payer yet.
          </div>
        )}

        {payers.map(p => {
          const payerRules = billingRules[p] || [];
          if (payerRules.length === 0) return null;
          return (
            <div key={p} className="card" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#FF8200', marginBottom: 6 }}>{p}</div>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {payerRules.map((r, i) => (
                  <li key={i} style={{ fontSize: 14, color: '#374151', marginBottom: 2 }}>{r}</li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}
