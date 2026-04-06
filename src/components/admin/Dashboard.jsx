import { useState, useEffect, useMemo } from 'react';
import { store } from '../../utils/store';
import { supabase } from '../../utils/supabase';
import { decryptPHI } from '../../utils/crypto';
import { useAdminData } from '../../utils/useAdminData';

export default function Dashboard() {
  const { rates, payers, allProviders, codeLabels, loading } = useAdminData();
  const [visits, setVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [period, setPeriod] = useState('30'); // days

  const users = store.getUsers();
  const combos = store.getCombos();
  const log = store.getLog();

  // Load billing entries from Supabase
  useEffect(() => {
    (async () => {
      setVisitsLoading(true);
      let query = supabase.from('billing_entries').select('*').order('visit_date', { ascending: false });
      if (period !== 'all') {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(period));
        query = query.gte('visit_date', d.toISOString().split('T')[0]);
      }
      const { data } = await query;
      setVisits((data || []).map(e => ({ ...e, patient_name: decryptPHI(e.patient_name) })));
      setVisitsLoading(false);
    })();
  }, [period]);

  const activeUsers = useMemo(() => users.filter(u => u.active), [users]);

  // ── Revenue by Location ──────────────────────────────
  const revenueByLocation = useMemo(() => {
    const map = {};
    visits.forEach(v => {
      const loc = v.location || 'Unknown';
      if (!map[loc]) map[loc] = { total: 0, count: 0 };
      map[loc].total += Number(v.total || 0);
      map[loc].count += 1;
    });
    return Object.entries(map)
      .map(([loc, d]) => ({ location: loc, total: d.total, count: d.count, avg: d.count > 0 ? d.total / d.count : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [visits]);

  // ── Revenue by Provider (therapist) ──────────────────
  const revenueByProvider = useMemo(() => {
    const map = {};
    visits.forEach(v => {
      const prov = v.provider || 'Unassigned';
      if (!map[prov]) map[prov] = { total: 0, count: 0 };
      map[prov].total += Number(v.total || 0);
      map[prov].count += 1;
    });
    return Object.entries(map)
      .map(([prov, d]) => {
        const info = (allProviders || []).find(p => p.name === prov);
        const type = prov.includes('(OT)') ? 'OT'
          : prov.includes('(COTA)') ? 'COTA'
          : prov.includes('(PTA)') ? 'PTA'
          : 'PT';
        return { provider: prov, location: info?.location || '', type, total: d.total, count: d.count, avg: d.count > 0 ? d.total / d.count : 0 };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [visits, allProviders]);

  // ── Revenue by Discipline (PT vs OT vs COTA vs PTA) ──
  const revenueByDiscipline = useMemo(() => {
    const map = {};
    visits.forEach(v => {
      const prov = v.provider || '';
      const type = prov.includes('(OT)') ? 'OT'
        : prov.includes('(COTA)') ? 'COTA'
        : prov.includes('(PTA)') ? 'PTA'
        : 'PT';
      if (!map[type]) map[type] = { total: 0, count: 0 };
      map[type].total += Number(v.total || 0);
      map[type].count += 1;
    });
    return Object.entries(map)
      .map(([type, d]) => ({ type, total: d.total, count: d.count, avg: d.count > 0 ? d.total / d.count : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [visits]);

  // ── Revenue by Payer ─────────────────────────────────
  const revenueByPayer = useMemo(() => {
    const map = {};
    visits.forEach(v => {
      const p = v.payer || 'Unknown';
      if (!map[p]) map[p] = { total: 0, count: 0 };
      map[p].total += Number(v.total || 0);
      map[p].count += 1;
    });
    return Object.entries(map)
      .map(([payer, d]) => ({ payer, total: d.total, count: d.count, avg: d.count > 0 ? d.total / d.count : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [visits]);

  // ── Most Billed Codes ────────────────────────────────
  const topCodes = useMemo(() => {
    const freq = {};
    visits.forEach(v => {
      (v.codes || []).forEach(code => {
        if (!freq[code]) freq[code] = { count: 0 };
        freq[code].count += 1;
      });
    });
    return Object.entries(freq)
      .map(([code, d]) => ({ code, label: codeLabels[code] || '', count: d.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [visits, codeLabels]);

  // ── Visits Over Time (by week) ───────────────────────
  const visitsByWeek = useMemo(() => {
    const map = {};
    visits.forEach(v => {
      const d = new Date(v.visit_date + 'T12:00:00');
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!map[key]) map[key] = { count: 0, total: 0 };
      map[key].count += 1;
      map[key].total += Number(v.total || 0);
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, d]) => ({ week, ...d }));
  }, [visits]);

  // ── Summary totals ───────────────────────────────────
  const totalRevenue = visits.reduce((s, v) => s + Number(v.total || 0), 0);
  const totalVisits = visits.length;
  const avgPerVisit = totalVisits > 0 ? totalRevenue / totalVisits : 0;
  const uniquePatients = new Set(visits.map(v => (v.patient_name || '').toLowerCase())).size;

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading…</div>;

  const maxBarValue = (arr, key) => Math.max(...arr.map(r => r[key] || 0), 1);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>Business Dashboard</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['7', '30', '90', '365', 'all'].map(p => (
            <button key={p} className={`group-pill${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
              {p === 'all' ? 'All Time' : `${p}d`}
            </button>
          ))}
        </div>
      </div>

      {visitsLoading && <div style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontSize: 13 }}>Loading visit data…</div>}

      {/* KPI Cards */}
      <div className="grid-3" style={{ gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}` },
          { label: 'Total Visits', value: totalVisits },
          { label: 'Avg per Visit', value: `$${avgPerVisit.toFixed(2)}` },
          { label: 'Unique Patients', value: uniquePatients },
          { label: 'Active Staff', value: activeUsers.length },
          { label: 'Locations', value: revenueByLocation.length },
        ].map(s => (
          <div className="card" key={s.label} style={{ textAlign: 'center' }}>
            <div className="field-label">{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#FF8200', marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Avg Reimbursement by Therapist */}
      <div className="section-head">Avg Reimbursement per Visit — by Therapist</div>
      <div className="card" style={{ marginBottom: 20, overflowX: 'auto' }}>
        {revenueByProvider.length === 0 ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: 16 }}>No visit data yet. Log visits in the Calculator to see analytics.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Therapist</th>
                <th style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Type</th>
                <th style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Location</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Visits</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Total</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Avg/Visit</th>
              </tr>
            </thead>
            <tbody>
              {revenueByProvider.map(r => (
                <tr key={r.provider} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.provider}</td>
                  <td style={{ textAlign: 'center', padding: '8px 6px' }}><span className="badge" style={{ fontSize: 11 }}>{r.type}</span></td>
                  <td style={{ textAlign: 'center', padding: '8px 6px', color: '#6b7280' }}>{r.location}</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px' }}>{r.count}</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px' }}>${r.total.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 700, color: '#FF8200' }}>${r.avg.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* By Discipline */}
      <div className="section-head">Revenue by Discipline</div>
      <div className="grid-2" style={{ gap: 12, marginBottom: 20 }}>
        {revenueByDiscipline.map(d => (
          <div className="card" key={d.type} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 4 }}>{d.type}</div>
            <div className="grid-3" style={{ gap: 8 }}>
              <div>
                <div className="field-label">Visits</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{d.count}</div>
              </div>
              <div>
                <div className="field-label">Revenue</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>${d.total.toFixed(0)}</div>
              </div>
              <div>
                <div className="field-label">Avg/Visit</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#FF8200' }}>${d.avg.toFixed(2)}</div>
              </div>
            </div>
          </div>
        ))}
        {revenueByDiscipline.length === 0 && (
          <div className="card" style={{ color: '#9ca3af', textAlign: 'center', padding: 16 }}>No visit data yet.</div>
        )}
      </div>

      {/* By Location */}
      <div className="section-head">Revenue by Location</div>
      <div className="card" style={{ marginBottom: 20 }}>
        {revenueByLocation.length === 0 ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: 16 }}>No visit data yet.</div>
        ) : revenueByLocation.map(r => (
          <div key={r.location} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ minWidth: 120, fontWeight: 600, fontSize: 14 }}>{r.location}</span>
            <div style={{ flex: 1, height: 22, borderRadius: 6, background: '#f3f4f6', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 6, background: '#FF8200', width: `${(r.total / maxBarValue(revenueByLocation, 'total')) * 100}%`, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, minWidth: 80, textAlign: 'right' }}>${r.total.toFixed(0)}</span>
            <span style={{ fontSize: 12, color: '#6b7280', minWidth: 50, textAlign: 'right' }}>{r.count} visits</span>
            <span style={{ fontSize: 12, color: '#FF8200', fontWeight: 700, minWidth: 70, textAlign: 'right' }}>${r.avg.toFixed(2)}/v</span>
          </div>
        ))}
      </div>

      {/* By Payer */}
      <div className="section-head">Revenue by Payer</div>
      <div className="card" style={{ marginBottom: 20 }}>
        {revenueByPayer.length === 0 ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: 16 }}>No visit data yet.</div>
        ) : revenueByPayer.map(r => (
          <div key={r.payer} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ minWidth: 160, fontWeight: 600, fontSize: 13 }}>{r.payer}</span>
            <div style={{ flex: 1, height: 22, borderRadius: 6, background: '#f3f4f6', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 6, background: '#FF8200', width: `${(r.total / maxBarValue(revenueByPayer, 'total')) * 100}%` }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, minWidth: 80, textAlign: 'right' }}>${r.total.toFixed(0)}</span>
            <span style={{ fontSize: 12, color: '#6b7280', minWidth: 50, textAlign: 'right' }}>{r.count} visits</span>
            <span style={{ fontSize: 12, color: '#FF8200', fontWeight: 700, minWidth: 70, textAlign: 'right' }}>${r.avg.toFixed(2)}/v</span>
          </div>
        ))}
      </div>

      {/* Weekly Trend */}
      {visitsByWeek.length > 1 && (
        <>
          <div className="section-head">Weekly Visit Trend</div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140, padding: '0 4px' }}>
              {visitsByWeek.map(w => {
                const maxCount = maxBarValue(visitsByWeek, 'count');
                const h = Math.max((w.count / maxCount) * 120, 4);
                return (
                  <div key={w.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{w.count}</span>
                    <div style={{ width: '100%', height: h, background: '#FF8200', borderRadius: '4px 4px 0 0', minWidth: 8 }} />
                    <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                      {new Date(w.week + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Top Billed Codes */}
      <div className="section-head">Top 15 Billed Codes</div>
      <div className="card" style={{ marginBottom: 20 }}>
        {topCodes.length === 0 ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: 16 }}>No visit data yet.</div>
        ) : topCodes.map((c, i) => (
          <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ width: 24, fontWeight: 700, color: i < 3 ? '#FF8200' : '#9ca3af', fontSize: 13 }}>{i + 1}.</span>
            <span style={{ fontWeight: 700, fontSize: 14, minWidth: 60 }}>{c.code}</span>
            <span style={{ fontSize: 13, color: '#6b7280', flex: 1 }}>{c.label}</span>
            <span className="badge">{c.count}</span>
          </div>
        ))}
      </div>

      {/* Activity Summary */}
      <div className="section-head">System Activity</div>
      <div className="grid-3" style={{ gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Users', value: users.length },
          { label: 'Saved Combos', value: combos.length },
          { label: 'Log Entries', value: log.length },
        ].map(s => (
          <div className="card" key={s.label} style={{ textAlign: 'center' }}>
            <div className="field-label">{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
