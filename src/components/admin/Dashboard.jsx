import { useMemo } from 'react';
import { store } from '../../utils/store';
import { useAdminData } from '../../utils/useAdminData';

export default function Dashboard() {
  const { rates, payers, allProviders, loading } = useAdminData();

  const users = store.getUsers();
  const combos = store.getCombos();
  const log = store.getLog();

  const activeUsers = useMemo(() => users.filter(u => u.active === true), [users]);

  // Most Used Codes — top 10 by frequency across all saved combos
  const topCodes = useMemo(() => {
    const freq = {};
    combos.forEach(c => {
      (c.codes || []).forEach(code => {
        const key = typeof code === 'string' ? code : code.code || code.cpt || '';
        if (key) freq[key] = (freq[key] || 0) + 1;
      });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [combos]);

  // Activity Summary — count log entries by action type
  const activitySummary = useMemo(() => {
    const counts = {};
    log.forEach(entry => {
      const action = entry.action || 'unknown';
      counts[action] = (counts[action] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [log]);

  const maxActivity = activitySummary.length > 0 ? activitySummary[0][1] : 1;

  // Combos by Location — group by owner's location
  const combosByLocation = useMemo(() => {
    const userMap = {};
    users.forEach(u => { userMap[u.username] = u.location || 'Unknown'; });
    const locCounts = {};
    combos.forEach(c => {
      const loc = userMap[c.owner] || 'Unknown';
      locCounts[loc] = (locCounts[loc] || 0) + 1;
    });
    return Object.entries(locCounts).sort((a, b) => b[1] - a[1]);
  }, [combos, users]);

  if (loading) return <p style={{ padding: 24 }}>Loading dashboard data...</p>;

  const statCards = [
    { label: 'Total Users', value: users.length },
    { label: 'Active Users', value: activeUsers.length },
    { label: 'Total Saved Combos', value: combos.length },
    { label: 'Total Rate Codes', value: Object.keys(rates || {}).length },
    { label: 'Total Payers', value: (payers || []).length },
    { label: 'Total Providers', value: (allProviders || []).length },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <h2 className="section-head">Dashboard</h2>

      {/* Stat Cards */}
      <div className="grid-3" style={{ gap: 12, marginBottom: 24 }}>
        {statCards.map(s => (
          <div className="card" key={s.label}>
            <span className="field-label">{s.label}</span>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#FF8200', marginTop: 4 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Most Used Codes */}
      <h2 className="section-head">Most Used Codes</h2>
      <div className="card card-surface" style={{ marginBottom: 24 }}>
        {topCodes.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No combo data yet.</p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {topCodes.map(([code, count], i) => (
              <li key={code} style={{ padding: '4px 0', fontWeight: i < 3 ? 600 : 400 }}>
                {code}{' '}
                <span className="badge">{count}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Activity Summary */}
      <h2 className="section-head">Activity Summary</h2>
      <div className="card card-surface" style={{ marginBottom: 24 }}>
        {activitySummary.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No activity logged yet.</p>
        ) : (
          <div>
            {activitySummary.map(([action, count]) => (
              <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ minWidth: 140, fontWeight: 500 }}>{action}</span>
                <div style={{
                  height: 18,
                  borderRadius: 4,
                  background: '#FF8200',
                  width: `${Math.max((count / maxActivity) * 100, 8)}%`,
                  transition: 'width 0.3s',
                }} />
                <span className="badge" style={{ marginLeft: 4 }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Combos by Location */}
      <h2 className="section-head">Combos by Location</h2>
      <div className="card card-surface">
        {combosByLocation.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No combo data yet.</p>
        ) : (
          <div>
            {combosByLocation.map(([loc, count]) => (
              <div key={loc} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontWeight: 500 }}>{loc}</span>
                <span className="badge">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
