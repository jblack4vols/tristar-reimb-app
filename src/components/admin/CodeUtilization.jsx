import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { useAdminData } from '../../utils/useAdminData';

function pctBar(value, max, color) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 32, textAlign: 'right' }}>{value.toFixed(1)}%</span>
    </div>
  );
}

export default function CodeUtilization() {
  const { codeLabels, allProviders, loading: adminLoading } = useAdminData();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('90');
  const [focusProvider, setFocusProvider] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase.from('billing_entries').select('provider, codes, total');
      if (period !== 'all') {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(period));
        query = query.gte('visit_date', d.toISOString().split('T')[0]);
      }
      const { data } = await query;
      setEntries(data || []);
      setLoading(false);
    })();
  }, [period]);

  // Per-provider code usage rates
  const providerData = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const prov = e.provider || 'Unassigned';
      if (!map[prov]) map[prov] = { visits: 0, codes: {}, totalRev: 0 };
      map[prov].visits += 1;
      map[prov].totalRev += Number(e.total || 0);
      (e.codes || []).forEach(c => {
        map[prov].codes[c] = (map[prov].codes[c] || 0) + 1;
      });
    });
    return map;
  }, [entries]);

  // Team-wide code usage rates (% of visits that include each code)
  const teamRates = useMemo(() => {
    const totalVisits = entries.length;
    if (totalVisits === 0) return {};
    const codeFreq = {};
    entries.forEach(e => {
      (e.codes || []).forEach(c => {
        codeFreq[c] = (codeFreq[c] || 0) + 1;
      });
    });
    const rates = {};
    Object.entries(codeFreq).forEach(([code, count]) => {
      rates[code] = (count / totalVisits) * 100;
    });
    return rates;
  }, [entries]);

  // All codes sorted by team usage
  const allCodes = useMemo(() => {
    return Object.entries(teamRates)
      .sort((a, b) => b[1] - a[1])
      .map(([code, rate]) => ({ code, teamRate: rate, label: codeLabels[code] || '' }));
  }, [teamRates, codeLabels]);

  // Provider list from actual billing data
  const providers = useMemo(() => {
    return Object.entries(providerData)
      .filter(([name]) => name !== 'Unassigned')
      .map(([name, d]) => {
        const info = (allProviders || []).find(p => p.name === name);
        return { name, visits: d.visits, totalRev: d.totalRev, location: info?.location || '', discipline: info?.discipline || 'PT' };
      })
      .sort((a, b) => b.visits - a.visits);
  }, [providerData, allProviders]);

  // Gaps: codes where a provider is significantly below team average
  const gaps = useMemo(() => {
    const result = [];
    providers.forEach(prov => {
      const pd = providerData[prov.name];
      if (!pd || pd.visits < 5) return; // need minimum visits for meaningful data

      allCodes.forEach(({ code, teamRate }) => {
        if (teamRate < 10) return; // ignore rarely-used codes
        const provRate = pd.codes[code] ? (pd.codes[code] / pd.visits) * 100 : 0;
        const gap = teamRate - provRate;

        if (gap > 15) { // more than 15 percentage points below team
          result.push({
            provider: prov.name,
            location: prov.location,
            discipline: prov.discipline,
            code,
            codeLabel: codeLabels[code] || '',
            provRate,
            teamRate,
            gap,
            missedVisits: Math.round((gap / 100) * pd.visits),
          });
        }
      });
    });
    return result.sort((a, b) => b.gap - a.gap).slice(0, 30);
  }, [providers, providerData, allCodes, codeLabels]);

  // Selected provider detail
  const focusData = useMemo(() => {
    if (!focusProvider || !providerData[focusProvider]) return null;
    const pd = providerData[focusProvider];
    return allCodes.map(({ code, teamRate, label }) => {
      const provCount = pd.codes[code] || 0;
      const provRate = pd.visits > 0 ? (provCount / pd.visits) * 100 : 0;
      return { code, label, provRate, teamRate, gap: teamRate - provRate, provCount };
    });
  }, [focusProvider, providerData, allCodes]);

  if (adminLoading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>Code Utilization Gaps</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['30', '90', '180', '365'].map(p => (
            <button key={p} className={`group-pill${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
              {p}d
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontSize: 13 }}>Loading...</div>}

      {/* Training Opportunities */}
      {gaps.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="optimization-tip" style={{ marginBottom: 12 }}>
            <span className="optimization-tip-icon">$</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4, color: '#16a34a' }}>
                Training Opportunities Found
              </div>
              <div>
                {gaps.length} code utilization gap{gaps.length !== 1 ? 's' : ''} detected where individual therapists are billing specific codes significantly less than the team average. These represent potential revenue opportunities through targeted training.
              </div>
            </div>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Therapist</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Code</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#dc2626', fontSize: 11, textTransform: 'uppercase' }}>Their Rate</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Team Rate</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Gap</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Est. Missed</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((g, i) => (
                  <tr key={`${g.provider}-${g.code}`} style={{ borderBottom: '1px solid #f3f4f6', background: i < 5 ? '#fefce8' : undefined }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                      {g.provider}
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{g.location}</div>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={{ fontWeight: 700 }}>{g.code}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>{g.codeLabel}</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: '#dc2626', fontWeight: 700 }}>{g.provRate.toFixed(1)}%</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px' }}>{g.teamRate.toFixed(1)}%</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: '#dc2626', fontWeight: 700 }}>-{g.gap.toFixed(1)}pp</td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', fontSize: 12, color: '#6b7280' }}>~{g.missedVisits} visits</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provider Drill-Down */}
      <div className="field-label" style={{ marginBottom: 8 }}>Therapist Code Profile</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <select value={focusProvider} onChange={e => setFocusProvider(e.target.value)} style={{ marginBottom: 12 }}>
          <option value="">Select a therapist to compare...</option>
          {providers.map(p => (
            <option key={p.name} value={p.name}>{p.name} ({p.visits} visits)</option>
          ))}
        </select>

        {focusData && (
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {focusData.filter(d => d.teamRate >= 5).map(d => {
              const color = d.gap > 15 ? '#dc2626' : d.gap > 5 ? '#d97706' : '#16a34a';
              return (
                <div key={d.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ minWidth: 70 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{d.code}</span>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{d.label}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>
                      Theirs: <strong style={{ color }}>{d.provRate.toFixed(1)}%</strong> vs Team: <strong>{d.teamRate.toFixed(1)}%</strong>
                    </div>
                    {pctBar(d.provRate, Math.max(d.teamRate, d.provRate, 1), color)}
                  </div>
                  <div style={{ minWidth: 50, textAlign: 'right', fontSize: 12, fontWeight: 700, color }}>
                    {d.gap > 0 ? `-${d.gap.toFixed(0)}` : `+${Math.abs(d.gap).toFixed(0)}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!focusProvider && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: 14 }}>
            Select a therapist above to see their code usage compared to the team average.
          </div>
        )}
      </div>
    </div>
  );
}
