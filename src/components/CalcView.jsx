import React, { useState, useMemo, useCallback } from 'react';
import { CPT_CODES, minutesToUnits } from '../data/codes';
import { DEFAULT_RATES, RATE_TYPES, PAYER_MULTIPLIERS } from '../data/rates';
import { store } from '../utils/store';

const codeOptions = Object.entries(CPT_CODES).map(([code, meta]) => ({
  code,
  label: `${code} — ${meta.label}`,
  isTimed: meta.isTimed,
}));

const payerOptions = Object.values(RATE_TYPES);

function emptyLine() {
  return { id: Date.now() + Math.random(), code: '97110', units: 1, minutes: 15 };
}

export default function CalcView({ user }) {
  const [payer, setPayer] = useState(RATE_TYPES.MEDICARE);
  const [lines, setLines] = useState([emptyLine()]);

  const addLine = useCallback(() => {
    setLines(prev => [...prev, emptyLine()]);
  }, []);

  const removeLine = useCallback((id) => {
    setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }, []);

  const updateLine = useCallback((id, field, value) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === 'minutes') {
        const meta = CPT_CODES[updated.code];
        if (meta?.isTimed) {
          updated.units = minutesToUnits(Number(value) || 0);
        }
      }
      if (field === 'code') {
        const meta = CPT_CODES[value];
        if (meta?.isTimed) {
          updated.units = minutesToUnits(Number(updated.minutes) || 0);
        } else {
          updated.units = 1;
          updated.minutes = 0;
        }
      }
      return updated;
    }));
  }, []);

  const multiplier = PAYER_MULTIPLIERS[payer] || 1.0;

  const lineDetails = useMemo(() => {
    return lines.map(l => {
      const rate = DEFAULT_RATES[l.code];
      const unitRate = rate ? +(rate.medicare * multiplier).toFixed(2) : 0;
      const meta = CPT_CODES[l.code];
      const units = meta?.isTimed ? l.units : 1;
      return {
        ...l,
        unitRate,
        units,
        lineTotal: +(unitRate * units).toFixed(2),
        isTimed: meta?.isTimed || false,
      };
    });
  }, [lines, multiplier]);

  const total = useMemo(() => {
    return lineDetails.reduce((sum, l) => sum + l.lineTotal, 0);
  }, [lineDetails]);

  const handleSaveCombo = useCallback(() => {
    const name = prompt('Name this combo:');
    if (!name) return;
    const combos = store.getCombos();
    combos.push({
      id: Date.now(),
      name,
      payer,
      lines: lines.map(l => ({ code: l.code, units: l.units, minutes: l.minutes })),
      createdBy: user.email,
      createdAt: new Date().toISOString(),
    });
    store.setCombos(combos);
    store.pushLog({ action: 'combo_created', user: user.email, detail: `Saved combo "${name}"` });
    alert(`Combo "${name}" saved!`);
  }, [lines, payer, user]);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Reimbursement Calculator</h2>
        <button className="btn btn-outline btn-sm" onClick={handleSaveCombo}>
          Save as Combo
        </button>
      </div>

      <div className="form-group">
        <label className="form-label">Payer Type</label>
        <select
          className="form-select"
          value={payer}
          onChange={e => setPayer(e.target.value)}
        >
          {payerOptions.map(p => (
            <option key={p} value={p}>{p} ({PAYER_MULTIPLIERS[p]}x)</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 80px 36px', gap: 8, marginBottom: 6, fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 0 4px' }}>
          <span>CPT Code</span>
          <span>Minutes</span>
          <span>Units</span>
          <span>Amount</span>
          <span></span>
        </div>
        {lineDetails.map((l) => (
          <div key={l.id} className="calc-line">
            <select
              className="form-select"
              value={l.code}
              onChange={e => updateLine(l.id, 'code', e.target.value)}
            >
              {codeOptions.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <input
              className="form-input"
              type="number"
              min="0"
              max="120"
              value={l.isTimed ? (lines.find(x => x.id === l.id)?.minutes || 0) : ''}
              disabled={!l.isTimed}
              placeholder={l.isTimed ? 'min' : '—'}
              onChange={e => updateLine(l.id, 'minutes', e.target.value)}
            />
            <input
              className="form-input"
              type="number"
              min="0"
              value={l.units}
              readOnly={l.isTimed}
              onChange={e => !l.isTimed ? null : null}
              style={l.isTimed ? { background: 'var(--gray-100)' } : {}}
            />
            <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}>
              ${l.lineTotal.toFixed(2)}
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => removeLine(l.id)}
              title="Remove line"
              style={{ fontSize: 18, color: 'var(--red)' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button className="btn btn-secondary btn-sm" onClick={addLine}>
        + Add Code
      </button>

      <div className="calc-total-bar">
        <span className="calc-total-label">Estimated Reimbursement</span>
        <span className="calc-total-amount">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}
