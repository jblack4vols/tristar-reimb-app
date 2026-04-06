import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { useAdminData } from '../../utils/useAdminData';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const BRAND = '#FF8200';
const DEFAULT_TARGET = 10; // visits per day

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().split('T')[0];
}

function getFriday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -2 : 5 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().split('T')[0];
}

/** Count weekdays (Mon-Fri) between two YYYY-MM-DD dates, inclusive. */
function countWorkingDays(from, to) {
  const start = new Date(from + 'T12:00:00');
  const end = new Date(to + 'T12:00:00');
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day >= 1 && day <= 5) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(count, 1);
}

function statusColor(pct) {
  if (pct >= 100) return '#16a34a'; // green
  if (pct >= 80) return '#d97706';  // yellow / amber
  return '#dc2626';                  // red
}

function fmt$(n) {
  return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ------------------------------------------------------------------ */
/*  SortableHeader                                                    */
/* ------------------------------------------------------------------ */

function SortableHeader({ label, field, sortField, sortDir, onSort, align }) {
  const active = sortField === field;
  const arrow = active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
  return (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', textAlign: align || 'right' }}
      onClick={() => onSort(field)}
    >
      {label}{arrow}
    </th>
  );
}

/* ------------------------------------------------------------------ */
/*  ProductivityTracker                                               */
/* ------------------------------------------------------------------ */

export default function ProductivityTracker() {
  const { allProviders, loading: adminLoading } = useAdminData();

  const today = new Date();
  const [fromDate, setFromDate] = useState(getMonday(today));
  const [toDate, setToDate] = useState(getFriday(today));
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [sortField, setSortField] = useState('avgVisits');
  const [sortDir, setSortDir] = useState('desc');

  /* ── Fetch billing_entries ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingEntries(true);
      const { data } = await supabase
        .from('billing_entries')
        .select('*')
        .gte('visit_date', fromDate)
        .lte('visit_date', toDate)
        .order('visit_date', { ascending: true });
      if (!cancelled) {
        setEntries(data || []);
        setLoadingEntries(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fromDate, toDate]);

  /* ── Derived rows ── */
  const workingDays = useMemo(() => countWorkingDays(fromDate, toDate), [fromDate, toDate]);

  const rows = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const prov = e.provider || 'Unassigned';
      if (!map[prov]) map[prov] = { name: prov, totalRevenue: 0, totalVisits: 0 };
      map[prov].totalRevenue += Number(e.total || 0);
      map[prov].totalVisits += 1;
    });

    return Object.values(map).map(r => {
      const info = (allProviders || []).find(p => p.name === r.name);
      const type = r.name.includes('(OT)') ? 'OT'
        : r.name.includes('(COTA)') ? 'COTA'
        : r.name.includes('(PTA)') ? 'PTA'
        : 'PT';
      const avgVisits = r.totalVisits / workingDays;
      const avgRevenue = r.totalVisits > 0 ? r.totalRevenue / r.totalVisits : 0;
      const pct = target > 0 ? (avgVisits / target) * 100 : 0;

      return {
        ...r,
        location: info?.location || '',
        type,
        avgVisits,
        avgRevenue,
        pct,
      };
    });
  }, [entries, allProviders, workingDays, target]);

  /* ── Group by location ── */
  const grouped = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (typeof va === 'string') {
        va = va.toLowerCase();
        vb = (vb || '').toLowerCase();
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const locMap = {};
    sorted.forEach(r => {
      const loc = r.location || 'Unassigned';
      if (!locMap[loc]) locMap[loc] = [];
      locMap[loc].push(r);
    });

    return Object.entries(locMap).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, sortField, sortDir]);

  /* ── Top performer ── */
  const topPerformer = useMemo(() => {
    if (rows.length === 0) return null;
    return rows.reduce((best, r) => (r.avgVisits > best.avgVisits ? r : best), rows[0]);
  }, [rows]);

  /* ── Totals ── */
  const totals = useMemo(() => {
    const totalVisits = rows.reduce((s, r) => s + r.totalVisits, 0);
    const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
    const avgVisits = rows.length > 0 ? totalVisits / workingDays : 0;
    const avgRevenue = totalVisits > 0 ? totalRevenue / totalVisits : 0;
    return { totalVisits, totalRevenue, avgVisits, avgRevenue };
  }, [rows, workingDays]);

  /* ── Sort handler ── */
  const handleSort = (field) => {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  /* ── Render ── */
  if (adminLoading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</div>;
  }

  return (
    <div>
      <div className="section-head" style={{ marginBottom: 12 }}>Therapist Productivity Tracker</div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid-3" style={{ gap: 12, alignItems: 'end' }}>
          <div>
            <label className="field-label">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
            />
          </div>
          <div>
            <label className="field-label">To</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
            />
          </div>
          <div>
            <label className="field-label">Target (visits/day)</label>
            <input
              type="number"
              min="1"
              value={target}
              onChange={e => setTarget(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
            />
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
          Working days in range: <strong>{workingDays}</strong>
        </div>
      </div>

      {loadingEntries && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontSize: 13 }}>Loading visit data...</div>
      )}

      {!loadingEntries && rows.length === 0 && (
        <div className="alert-warning" style={{ marginBottom: 16 }}>
          No billing entries found for the selected date range.
        </div>
      )}

      {/* Top Performer Highlight */}
      {topPerformer && !loadingEntries && (
        <div className="card" style={{ marginBottom: 16, border: `2px solid ${BRAND}`, background: '#fff8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>&#9733;</span>
            <div>
              <div style={{ fontWeight: 700, color: BRAND, fontSize: 14 }}>Top Performer</div>
              <div style={{ fontSize: 13 }}>
                <strong>{topPerformer.name}</strong>
                {topPerformer.location ? ` — ${topPerformer.location}` : ''}
                {' | '}
                {topPerformer.avgVisits.toFixed(1)} visits/day
                {' | '}
                {fmt$(topPerformer.avgRevenue)} avg/visit
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Productivity Table */}
      {rows.length > 0 && (
        <div className="rate-table-wrap" style={{ marginBottom: 20 }}>
          <table className="rate-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <SortableHeader label="Therapist" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="left" />
                <SortableHeader label="Location" field="location" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="left" />
                <SortableHeader label="Type" field="type" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="center" />
                <SortableHeader label="Visits" field="totalVisits" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Revenue" field="totalRevenue" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Avg Visits/Day" field="avgVisits" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Avg Rev/Visit" field="avgRevenue" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th style={{ textAlign: 'center', minWidth: 160 }}>Progress vs Target</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([loc, locRows]) => {
                const locVisits = locRows.reduce((s, r) => s + r.totalVisits, 0);
                const locRevenue = locRows.reduce((s, r) => s + r.totalRevenue, 0);
                const locAvgVisits = locVisits / workingDays;
                const locAvgRevenue = locVisits > 0 ? locRevenue / locVisits : 0;

                return [
                  /* Location group header */
                  <tr key={`loc-${loc}`} style={{ background: '#f3f4f6' }}>
                    <td colSpan={8} style={{ fontWeight: 700, fontSize: 13, textAlign: 'left', color: '#374151', letterSpacing: 0.3 }}>
                      {loc}
                    </td>
                  </tr>,

                  /* Provider rows */
                  ...locRows.map(r => {
                    const color = statusColor(r.pct);
                    const isTop = topPerformer && r.name === topPerformer.name;

                    return (
                      <tr key={r.name} style={isTop ? { background: '#fffbeb' } : undefined}>
                        <td style={{ textAlign: 'left', fontWeight: isTop ? 700 : 400 }}>
                          {r.name}
                          {isTop && (
                            <span className="badge" style={{ marginLeft: 6, background: BRAND, color: '#fff', fontSize: 10, padding: '2px 6px' }}>
                              TOP
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'left' }}>{r.location}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge" style={{
                            background: r.type === 'OT' ? '#dbeafe' : r.type === 'COTA' ? '#ede9fe' : r.type === 'PTA' ? '#fce7f3' : '#dcfce7',
                            color: r.type === 'OT' ? '#1d4ed8' : r.type === 'COTA' ? '#6d28d9' : r.type === 'PTA' ? '#be185d' : '#15803d',
                            fontSize: 11,
                            padding: '2px 8px',
                          }}>
                            {r.type}
                          </span>
                        </td>
                        <td>{r.totalVisits}</td>
                        <td>{fmt$(r.totalRevenue)}</td>
                        <td style={{ fontWeight: 600, color }}>{r.avgVisits.toFixed(1)}</td>
                        <td>{fmt$(r.avgRevenue)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                            <div style={{ flex: 1, maxWidth: 100, height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
                              <div style={{
                                width: `${Math.min(r.pct, 100)}%`,
                                height: '100%',
                                background: color,
                                borderRadius: 5,
                                transition: 'width 0.3s ease',
                              }} />
                            </div>
                            <span style={{ fontSize: 11, color, fontWeight: 600, minWidth: 36 }}>
                              {r.pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  }),

                  /* Location subtotal */
                  <tr key={`sub-${loc}`} style={{ background: '#fafafa', borderTop: '2px solid #e5e7eb' }}>
                    <td style={{ textAlign: 'left', fontWeight: 600, fontStyle: 'italic', fontSize: 12, color: '#6b7280' }} colSpan={3}>
                      {loc} Subtotal ({locRows.length} therapist{locRows.length !== 1 ? 's' : ''})
                    </td>
                    <td style={{ fontWeight: 600 }}>{locVisits}</td>
                    <td style={{ fontWeight: 600 }}>{fmt$(locRevenue)}</td>
                    <td style={{ fontWeight: 600 }}>{locAvgVisits.toFixed(1)}</td>
                    <td style={{ fontWeight: 600 }}>{fmt$(locAvgRevenue)}</td>
                    <td />
                  </tr>,
                ];
              })}

              {/* Grand totals */}
              <tr style={{ background: '#1f2937', color: '#fff', fontWeight: 700 }}>
                <td style={{ textAlign: 'left' }} colSpan={3}>
                  TOTAL ({rows.length} therapist{rows.length !== 1 ? 's' : ''})
                </td>
                <td>{totals.totalVisits}</td>
                <td>{fmt$(totals.totalRevenue)}</td>
                <td>{totals.avgVisits.toFixed(1)}</td>
                <td>{fmt$(totals.avgRevenue)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
