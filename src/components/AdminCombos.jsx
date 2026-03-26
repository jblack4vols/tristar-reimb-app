import { useState } from 'react';
import { store } from '../utils/store';
import { useAdminData } from '../utils/useAdminData';

export default function AdminCombos() {
  const { rates: RATES } = useAdminData();
  const [combos, setCombos] = useState(store.getCombos);
  const [search, setSearch] = useState('');

  const del = async (id) => {
    if (!confirm('Delete this combo?')) return;
    const up = store.getCombos().filter(c => c.id !== id);
    await store.setCombos(up);
    await store.pushLog({ user: 'jordan', action: 'delete_combo', detail: id });
    setCombos(up);
  };

  const filtered = combos.filter(c =>
    !search || [c.name || '', c.owner || '', c.payer || ''].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="section-head">
        All Saved Combos <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>({combos.length})</span>
      </div>
      <input
        placeholder="Search by name, owner, or payer…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: 15 }}>
          No saved combos yet.
        </div>
      )}

      {filtered.map(c => {
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
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
              {c.payer && <span style={{ marginRight: 12 }}><strong>Payer:</strong> {c.payer}</span>}
              {c.owner && <span style={{ marginRight: 12 }}><strong>Owner:</strong> {c.owner}</span>}
              {c.savedAt && <span style={{ color: '#9ca3af' }}>{new Date(c.savedAt).toLocaleDateString()}</span>}
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>Delete</button>
          </div>
        );
      })}
    </div>
  );
}
