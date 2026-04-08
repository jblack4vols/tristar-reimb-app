import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { useAdminData } from '../../utils/useAdminData';

function fmt$(n) {
  if (n === null || n === undefined) return '--';
  return '$' + Number(n).toFixed(2);
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function RateChangeLog() {
  const { codeLabels, loading: adminLoading } = useAdminData();
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPayer, setFilterPayer] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('rate_changes')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(500);
      setChanges(data || []);
      setLoading(false);
    })();
  }, []);

  // Unique filter values
  const payerOptions = useMemo(() => [...new Set(changes.map(c => c.payer).filter(Boolean))].sort(), [changes]);
  const userOptions = useMemo(() => [...new Set(changes.map(c => c.changed_by).filter(Boolean))].sort(), [changes]);

  const filtered = useMemo(() => {
    let result = changes;
    if (filterPayer) result = result.filter(c => c.payer === filterPayer);
    if (filterCode) result = result.filter(c => c.code.toLowerCase().includes(filterCode.toLowerCase()));
    if (filterUser) result = result.filter(c => c.changed_by === filterUser);
    return result.slice(0, limit);
  }, [changes, filterPayer, filterCode, filterUser, limit]);

  // Summary stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const todayChanges = changes.filter(c => (c.changed_at || '').startsWith(today));
    const weekChanges = changes.filter(c => c.changed_at >= weekAgo);

    let increases = 0;
    let decreases = 0;
    changes.forEach(c => {
      const old = Number(c.old_amount || 0);
      const now = Number(c.new_amount || 0);
      if (now > old) increases++;
      else if (now < old) decreases++;
    });

    return { total: changes.length, today: todayChanges.length, week: weekChanges.length, increases, decreases };
  }, [changes]);

  if (adminLoading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</div>;

  return (
    <div>
      <div className="section-head">Rate Change History</div>

      {/* Summary Cards */}
      <div className="grid-3" style={{ gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Changes', value: stats.total, color: '#FF8200' },
          { label: 'This Week', value: stats.week, color: '#FF8200' },
          { label: 'Today', value: stats.today, color: '#FF8200' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{stats.increases}</div>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Rate Increases</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{stats.decreases}</div>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Rate Decreases</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid-3" style={{ gap: 10 }}>
          <div>
            <label className="field-label">Filter by Payer</label>
            <select value={filterPayer} onChange={e => setFilterPayer(e.target.value)}>
              <option value="">All Payers</option>
              {payerOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Filter by Code</label>
            <input
              type="text"
              placeholder="e.g. TX, EVAL"
              value={filterCode}
              onChange={e => setFilterCode(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Changed By</label>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)}>
              <option value="">All Users</option>
              {userOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontSize: 13 }}>Loading rate changes...</div>}

      {/* Change Log Table */}
      {!loading && (
        <div className="rate-table-wrap">
          <table className="rate-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', minWidth: 120 }}>Code</th>
                <th style={{ textAlign: 'left', minWidth: 130 }}>Payer</th>
                <th style={{ textAlign: 'right' }}>Old Rate</th>
                <th style={{ textAlign: 'right' }}>New Rate</th>
                <th style={{ textAlign: 'right' }}>Change</th>
                <th style={{ textAlign: 'left', minWidth: 100 }}>Changed By</th>
                <th style={{ textAlign: 'right', minWidth: 100 }}>When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>
                    No rate changes found{filterPayer || filterCode || filterUser ? ' matching filters' : ''}.
                  </td>
                </tr>
              )}
              {filtered.map((c, i) => {
                const oldAmt = Number(c.old_amount || 0);
                const newAmt = Number(c.new_amount || 0);
                const diff = newAmt - oldAmt;
                const isIncrease = diff > 0;
                const isNew = oldAmt === 0 && newAmt > 0;

                return (
                  <tr key={c.id || i}>
                    <td style={{ textAlign: 'left' }}>
                      <span style={{ fontWeight: 700 }}>{c.code}</span>
                      {codeLabels[c.code] && (
                        <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{codeLabels[c.code]}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'left' }}>{c.payer}</td>
                    <td style={{ textAlign: 'right', color: '#6b7280' }}>{fmt$(oldAmt)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt$(newAmt)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: isNew ? '#FF8200' : isIncrease ? '#16a34a' : '#dc2626' }}>
                      {isNew ? 'NEW' : `${diff >= 0 ? '+' : ''}${fmt$(diff)}`}
                    </td>
                    <td style={{ textAlign: 'left', fontSize: 12 }}>{c.changed_by || 'system'}</td>
                    <td style={{ textAlign: 'right', fontSize: 12, color: '#6b7280' }}>
                      {c.changed_at ? timeAgo(c.changed_at) : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length >= limit && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button className="btn btn-muted btn-sm" onClick={() => setLimit(l => l + 100)}>
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
