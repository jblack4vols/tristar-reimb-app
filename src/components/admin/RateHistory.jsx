import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';

export default function RateHistory() {
  const [changes, setChanges] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChanges();
  }, []);

  async function fetchChanges() {
    setLoading(true);
    const { data, error } = await supabase
      .from('rate_changes')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(100);
    if (!error && data) setChanges(data);
    setLoading(false);
  }

  const lc = filter.toLowerCase();
  const filtered = filter
    ? changes.filter(c =>
        c.code.toLowerCase().includes(lc) ||
        c.payer.toLowerCase().includes(lc) ||
        (c.changed_by || '').toLowerCase().includes(lc)
      )
    : changes;

  const fmt = (v) => v == null ? '—' : `$${Number(v).toFixed(2)}`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div className="section-head">
          Rate Change History{' '}
          <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>
            ({filtered.length} entries)
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Filter by code, payer, or user..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, width: 260 }}
          />
          <button className="btn btn-sm" onClick={fetchChanges} style={{ whiteSpace: 'nowrap' }}>
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: 15 }}>
          Loading rate history...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: 15 }}>
          No rate changes recorded yet.
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="card" style={{ maxHeight: 540, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 0 }}>
          {filtered.map((c) => (
            <div key={c.id} className="log-entry">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginBottom: 2 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: '#1565c0', color: '#fff', fontWeight: 700, fontSize: 12 }}>
                    {c.code}
                  </span>
                  <span className="badge" style={{ background: '#f3f4f6', color: '#374151', fontSize: 12 }}>
                    {c.payer}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  {c.changed_at ? new Date(c.changed_at).toLocaleString() : ''}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                <span style={{ color: '#b71c1c', fontWeight: 600 }}>{fmt(c.old_amount)}</span>
                {' \u2192 '}
                <span style={{ color: '#1b5e20', fontWeight: 600 }}>{fmt(c.new_amount)}</span>
                {c.changed_by ? (
                  <span> — by <strong style={{ color: '#1a1a1a' }}>{c.changed_by}</strong></span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
