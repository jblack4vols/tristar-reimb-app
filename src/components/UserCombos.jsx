import { useState } from 'react';
import { store } from '../utils/store';
import { useAdminData } from '../utils/useAdminData';

export default function UserCombos({ user }) {
  const { rates: RATES } = useAdminData();
  const uid = user.id || user.username;
  const [combos, setCombos] = useState(() =>
    store.getCombos().filter(c => c.ownerId === uid)
  );

  const del = async (id) => {
    if (!confirm('Delete this combo?')) return;
    const up = store.getCombos().filter(c => c.id !== id);
    await store.setCombos(up);
    setCombos(up.filter(c => c.ownerId === uid));
  };

  return (
    <div>
      <div className="section-head">My Saved Combos</div>

      {combos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#f3f4f6', borderRadius: 14, color: '#6b7280', fontSize: 15, lineHeight: 1.6 }}>
          No combos saved yet.<br/>
          Build a visit in the <strong>Calculator</strong> tab, then tap <strong>Save Combo</strong>.
        </div>
      )}

      {combos.map(c => {
        const amt = c.payer
          ? c.codes.reduce((s, code) => s + ((RATES[code] || {})[c.payer] || 0), 0)
          : null;
        return (
          <div key={c.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
              {amt !== null && (
                <div style={{ fontWeight: 700, color: '#FF8200', fontSize: 16, flexShrink: 0 }}>
                  ${amt.toFixed(2)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              {c.codes.map(code => <span key={code} className="badge" style={{ fontSize: 11 }}>{code}</span>)}
            </div>
            {c.payer && (
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
                <strong>Payer:</strong> {c.payer}
                {c.savedAt && <span style={{ color: '#9ca3af', marginLeft: 10 }}>{new Date(c.savedAt).toLocaleDateString()}</span>}
              </div>
            )}
            {user?.role === 'superadmin' && (
              <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>Delete</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
