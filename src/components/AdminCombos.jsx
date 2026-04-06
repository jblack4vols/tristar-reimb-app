import React, { useState, useEffect } from 'react';
import { store } from '../utils/store';
import { CPT_CODES } from '../data/codes';
import { DEFAULT_RATES, PAYER_MULTIPLIERS } from '../data/rates';

export default function AdminCombos({ user }) {
  const [combos, setCombos] = useState([]);

  useEffect(() => {
    setCombos(store.getCombos());
  }, []);

  function handleDelete(id) {
    const target = combos.find(c => c.id === id);
    if (!target) return;
    if (!confirm(`Delete combo "${target.name}"?`)) return;

    const updated = combos.filter(c => c.id !== id);
    setCombos(updated);
    store.setCombos(updated);
    store.pushLog({ action: 'combo_deleted', user: user.email, detail: `Deleted combo "${target.name}"` });
  }

  function comboTotal(combo) {
    const multiplier = PAYER_MULTIPLIERS[combo.payer] || 1.0;
    return combo.lines.reduce((sum, l) => {
      const rate = DEFAULT_RATES[l.code];
      if (!rate) return sum;
      const meta = CPT_CODES[l.code];
      const units = meta?.isTimed ? l.units : 1;
      return sum + rate.medicare * multiplier * units;
    }, 0);
  }

  if (combos.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Saved Combos</h2>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <div className="empty-state-text">No combos saved yet. Use the Calculator to create one.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">All Saved Combos</h2>
        <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{combos.length} combos</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Payer</th>
              <th>Codes</th>
              <th>Est. Total</th>
              <th>Created By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {combos.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td>{c.payer}</td>
                <td>
                  {c.lines.map((l, i) => (
                    <span key={i} className="combo-chip">
                      {l.code} ×{l.units}
                    </span>
                  ))}
                </td>
                <td style={{ fontWeight: 700 }}>${comboTotal(c).toFixed(2)}</td>
                <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{c.createdBy}</td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(c.id)}
                    style={{ color: 'var(--red)' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
