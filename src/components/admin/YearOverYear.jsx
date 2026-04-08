import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { useAdminData } from '../../utils/useAdminData';

const BRAND = '#FF8200';
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const fmt = n => `$${Number(n || 0).toFixed(2)}`;
const _fmtK = n => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : fmt(n);

export default function YearOverYear() {
  const { _allProviders, loading } = useAdminData();
  const currentYear = new Date().getFullYear();
  const [thisYearVisits, setThisYearVisits] = useState([]);
  const [lastYearVisits, setLastYearVisits] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterProvider, setFilterProvider] = useState('');

  // Load both years of data
  useEffect(() => {
    (async () => {
      setFetching(true);
      const [{ data: thisData }, { data: lastData }] = await Promise.all([
        supabase.from('billing_entries').select('*')
          .gte('visit_date', `${currentYear}-01-01`)
          .lt('visit_date', `${currentYear + 1}-01-01`),
        supabase.from('billing_entries').select('*')
          .gte('visit_date', `${currentYear - 1}-01-01`)
          .lt('visit_date', `${currentYear}-01-01`),
      ]);
      setThisYearVisits(thisData || []);
      setLastYearVisits(lastData || []);
      setFetching(false);
    })();
  }, [currentYear]);

  // Available filter options
  const locations = useMemo(() => {
    const set = new Set();
    [...thisYearVisits, ...lastYearVisits].forEach(v => {
      if (v.location) set.add(v.location);
    });
    return [...set].sort();
  }, [thisYearVisits, lastYearVisits]);

  const providers = useMemo(() => {
    const set = new Set();
    [...thisYearVisits, ...lastYearVisits].forEach(v => {
      if (v.provider) set.add(v.provider);
    });
    return [...set].sort();
  }, [thisYearVisits, lastYearVisits]);

  // Apply filters (inlined to avoid stale closure in useMemo)
  const filteredThis = useMemo(() => {
    let filtered = thisYearVisits;
    if (filterLocation) filtered = filtered.filter(v => v.location === filterLocation);
    if (filterProvider) filtered = filtered.filter(v => v.provider === filterProvider);
    return filtered;
  }, [thisYearVisits, filterLocation, filterProvider]);
  const filteredLast = useMemo(() => {
    let filtered = lastYearVisits;
    if (filterLocation) filtered = filtered.filter(v => v.location === filterLocation);
    if (filterProvider) filtered = filtered.filter(v => v.provider === filterProvider);
    return filtered;
  }, [lastYearVisits, filterLocation, filterProvider]);

  // Aggregate by month
  const aggregateByMonth = (visits) => {
    const months = Array.from({ length: 12 }, () => ({ count: 0, revenue: 0 }));
    visits.forEach(v => {
      const d = new Date(v.visit_date + 'T12:00:00');
      const m = d.getMonth();
      months[m].count += 1;
      months[m].revenue += Number(v.total || 0);
    });
    return months;
  };

  const thisMonths = useMemo(() => aggregateByMonth(filteredThis), [filteredThis]);
  const lastMonths = useMemo(() => aggregateByMonth(filteredLast), [filteredLast]);

  // YTD totals (up to current month)
  const currentMonth = new Date().getMonth();
  const ytdThis = useMemo(() => {
    return thisMonths.slice(0, currentMonth + 1).reduce(
      (acc, m) => ({ count: acc.count + m.count, revenue: acc.revenue + m.revenue }), { count: 0, revenue: 0 }
    );
  }, [thisMonths, currentMonth]);

  const ytdLast = useMemo(() => {
    return lastMonths.slice(0, currentMonth + 1).reduce(
      (acc, m) => ({ count: acc.count + m.count, revenue: acc.revenue + m.revenue }), { count: 0, revenue: 0 }
    );
  }, [lastMonths, currentMonth]);

  const ytdRevenueChange = ytdLast.revenue > 0
    ? ((ytdThis.revenue - ytdLast.revenue) / ytdLast.revenue * 100)
    : ytdThis.revenue > 0 ? 100 : 0;

  const ytdVisitChange = ytdLast.count > 0
    ? ((ytdThis.count - ytdLast.count) / ytdLast.count * 100)
    : ytdThis.count > 0 ? 100 : 0;

  const pctColor = (pct) => pct > 0 ? '#16a34a' : pct < 0 ? '#dc2626' : '#6b7280';
  const pctBg = (pct) => pct > 0 ? '#f0fdf4' : pct < 0 ? '#fef2f2' : 'transparent';
  const fmtPct = (pct) => `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</div>;

  return (
    <div>
      <div className="section-head">Year-over-Year Comparison</div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid-3" style={{ gap: 12, alignItems: 'end' }}>
          <div>
            <div className="field-label">Filter by Location</div>
            <select
              value={filterLocation}
              onChange={e => setFilterLocation(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
            >
              <option value="">All Locations</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <div className="field-label">Filter by Provider</div>
            <select
              value={filterProvider}
              onChange={e => setFilterProvider(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
            >
              <option value="">All Providers</option>
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            {(filterLocation || filterProvider) && (
              <button className="btn btn-sm" onClick={() => { setFilterLocation(''); setFilterProvider(''); }}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {fetching && <div style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontSize: 13 }}>Loading year data...</div>}

      {!fetching && (
        <>
          {/* YTD Summary Cards */}
          <div className="grid-3" style={{ gap: 12, marginBottom: 20 }}>
            <div className="card card-surface" style={{ textAlign: 'center' }}>
              <div className="field-label">YTD Revenue {currentYear}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: BRAND, marginTop: 4 }}>{fmt(ytdThis.revenue)}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>vs {fmt(ytdLast.revenue)} in {currentYear - 1}</div>
            </div>
            <div className="card card-surface" style={{ textAlign: 'center' }}>
              <div className="field-label">YTD Revenue Change</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: pctColor(ytdRevenueChange), marginTop: 4 }}>
                {fmtPct(ytdRevenueChange)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {ytdThis.revenue >= ytdLast.revenue ? 'Ahead' : 'Behind'} by {fmt(Math.abs(ytdThis.revenue - ytdLast.revenue))}
              </div>
            </div>
            <div className="card card-surface" style={{ textAlign: 'center' }}>
              <div className="field-label">YTD Visit Change</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: pctColor(ytdVisitChange), marginTop: 4 }}>
                {fmtPct(ytdVisitChange)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {ytdThis.count} visits vs {ytdLast.count} last year
              </div>
            </div>
          </div>

          {/* Monthly Comparison Table */}
          <div className="section-head" style={{ fontSize: 14 }}>Monthly Breakdown</div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="rate-table-wrap">
              <table className="rate-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Month</th>
                    <th style={{ textAlign: 'right' }}>{currentYear - 1} Visits</th>
                    <th style={{ textAlign: 'right' }}>{currentYear - 1} Revenue</th>
                    <th style={{ textAlign: 'right' }}>{currentYear} Visits</th>
                    <th style={{ textAlign: 'right' }}>{currentYear} Revenue</th>
                    <th style={{ textAlign: 'right' }}>Visit %</th>
                    <th style={{ textAlign: 'right' }}>Revenue %</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map((monthName, i) => {
                    const last = lastMonths[i];
                    const curr = thisMonths[i];
                    const visitPct = last.count > 0
                      ? ((curr.count - last.count) / last.count * 100)
                      : curr.count > 0 ? 100 : 0;
                    const revPct = last.revenue > 0
                      ? ((curr.revenue - last.revenue) / last.revenue * 100)
                      : curr.revenue > 0 ? 100 : 0;
                    const isFuture = i > currentMonth;

                    return (
                      <tr key={i} style={{ opacity: isFuture ? 0.4 : 1 }}>
                        <td style={{ fontWeight: 600 }}>{monthName}</td>
                        <td style={{ textAlign: 'right' }}>{last.count || '—'}</td>
                        <td style={{ textAlign: 'right' }}>{last.revenue > 0 ? fmt(last.revenue) : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{curr.count || (isFuture ? '—' : '0')}</td>
                        <td style={{ textAlign: 'right' }}>{curr.revenue > 0 ? fmt(curr.revenue) : (isFuture ? '—' : '$0.00')}</td>
                        <td style={{
                          textAlign: 'right', fontWeight: 600,
                          color: isFuture ? '#9ca3af' : pctColor(visitPct),
                          background: isFuture ? 'transparent' : pctBg(visitPct),
                        }}>
                          {isFuture ? '—' : (last.count === 0 && curr.count === 0 ? '—' : fmtPct(visitPct))}
                        </td>
                        <td style={{
                          textAlign: 'right', fontWeight: 600,
                          color: isFuture ? '#9ca3af' : pctColor(revPct),
                          background: isFuture ? 'transparent' : pctBg(revPct),
                        }}>
                          {isFuture ? '—' : (last.revenue === 0 && curr.revenue === 0 ? '—' : fmtPct(revPct))}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Annual Totals Row */}
                  {(() => {
                    const totalLastVisits = lastMonths.reduce((s, m) => s + m.count, 0);
                    const totalLastRev = lastMonths.reduce((s, m) => s + m.revenue, 0);
                    const totalThisVisits = thisMonths.reduce((s, m) => s + m.count, 0);
                    const totalThisRev = thisMonths.reduce((s, m) => s + m.revenue, 0);
                    const vPct = totalLastVisits > 0 ? ((totalThisVisits - totalLastVisits) / totalLastVisits * 100) : 0;
                    const rPct = totalLastRev > 0 ? ((totalThisRev - totalLastRev) / totalLastRev * 100) : 0;
                    return (
                      <tr style={{ borderTop: '2px solid #e5e7eb', fontWeight: 700 }}>
                        <td style={{ fontWeight: 700 }}>TOTAL</td>
                        <td style={{ textAlign: 'right' }}>{totalLastVisits}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(totalLastRev)}</td>
                        <td style={{ textAlign: 'right' }}>{totalThisVisits}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(totalThisRev)}</td>
                        <td style={{ textAlign: 'right', color: pctColor(vPct) }}>{fmtPct(vPct)}</td>
                        <td style={{ textAlign: 'right', color: pctColor(rPct) }}>{fmtPct(rPct)}</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
