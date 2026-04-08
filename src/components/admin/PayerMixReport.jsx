import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { useAdminData } from '../../utils/useAdminData';

function fmt$(n) {
  return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function scoreColor(score) {
  if (score >= 80) return '#16a34a';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

function scoreBg(score) {
  if (score >= 80) return '#f0fdf4';
  if (score >= 50) return '#fffbeb';
  return '#fef2f2';
}

export default function PayerMixReport() {
  const { rates, payers, loading: adminLoading } = useAdminData();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('365');

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase.from('billing_entries').select('payer, codes, total, visit_date, provider, location');
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

  const totalVisits = entries.length;
  const totalRevenue = entries.reduce((s, e) => s + Number(e.total || 0), 0);
  const overallAvg = totalVisits > 0 ? totalRevenue / totalVisits : 0;

  // Payer analysis with scoring
  const payerAnalysis = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const p = e.payer || 'Unknown';
      if (!map[p]) map[p] = { visits: 0, revenue: 0, codes: 0, locations: new Set(), providers: new Set() };
      map[p].visits += 1;
      map[p].revenue += Number(e.total || 0);
      map[p].codes += (e.codes || []).length;
      if (e.location) map[p].locations.add(e.location);
      if (e.provider) map[p].providers.add(e.provider);
    });

    const maxVisits = Math.max(...Object.values(map).map(d => d.visits), 1);

    return Object.entries(map)
      .map(([payer, d]) => {
        const avgPerVisit = d.visits > 0 ? d.revenue / d.visits : 0;
        const avgCodes = d.visits > 0 ? d.codes / d.visits : 0;
        const volumePct = (d.visits / totalVisits) * 100;

        // Score: weighted combo of avg/visit (60%) + volume (20%) + codes/visit (20%)
        const revenueScore = overallAvg > 0 ? Math.min((avgPerVisit / overallAvg) * 100, 150) : 0;
        const volumeScore = Math.min((d.visits / maxVisits) * 100, 100);
        const codeScore = avgCodes >= 4 ? 100 : (avgCodes / 4) * 100;
        const compositeScore = (revenueScore * 0.6) + (volumeScore * 0.2) + (codeScore * 0.2);

        let recommendation;
        if (compositeScore >= 80 && avgPerVisit >= overallAvg) {
          recommendation = 'Pursue more referrals';
        } else if (compositeScore >= 60) {
          recommendation = 'Maintain current volume';
        } else if (avgPerVisit < overallAvg * 0.8) {
          recommendation = 'Negotiate rates or reduce volume';
        } else {
          recommendation = 'Monitor performance';
        }

        // Calculate rate competitiveness
        let rateStrength = 0;
        let rateCount = 0;
        if (rates) {
          Object.keys(rates).forEach(code => {
            const payerRate = (rates[code] || {})[payer] || 0;
            if (payerRate > 0) {
              const allRates = payers.map(p => (rates[code] || {})[p] || 0).filter(r => r > 0);
              if (allRates.length > 0) {
                const avg = allRates.reduce((s, r) => s + r, 0) / allRates.length;
                rateStrength += (payerRate / avg) * 100;
                rateCount++;
              }
            }
          });
        }
        const avgRateStrength = rateCount > 0 ? rateStrength / rateCount : 0;

        return {
          payer,
          visits: d.visits,
          revenue: d.revenue,
          avgPerVisit,
          avgCodes,
          volumePct,
          compositeScore,
          recommendation,
          avgRateStrength,
          locations: d.locations.size,
          providers: d.providers.size,
        };
      })
      .sort((a, b) => b.compositeScore - a.compositeScore);
  }, [entries, rates, payers, totalVisits, overallAvg]);

  // Tier breakdown
  const tiers = useMemo(() => {
    const top = payerAnalysis.filter(p => p.compositeScore >= 80);
    const mid = payerAnalysis.filter(p => p.compositeScore >= 50 && p.compositeScore < 80);
    const low = payerAnalysis.filter(p => p.compositeScore < 50);
    return { top, mid, low };
  }, [payerAnalysis]);

  if (adminLoading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>Payer Mix Optimization</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['90', '180', '365', 'all'].map(p => (
            <button key={p} className={`group-pill${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
              {p === 'all' ? 'All Time' : `${p}d`}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontSize: 13 }}>Loading...</div>}

      {/* Tier Summary */}
      <div className="grid-3" style={{ gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ borderColor: '#16a34a', borderWidth: 2, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a' }}>{tiers.top.length}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Top Tier Payers</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>High revenue, worth pursuing</div>
        </div>
        <div className="card" style={{ borderColor: '#d97706', borderWidth: 2, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#d97706' }}>{tiers.mid.length}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mid Tier Payers</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Acceptable, maintain volume</div>
        </div>
        <div className="card" style={{ borderColor: '#dc2626', borderWidth: 2, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>{tiers.low.length}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Low Tier Payers</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Dragging your average down</div>
        </div>
      </div>

      {/* Main Payer Table */}
      <div className="card" style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Payer</th>
              <th style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Score</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Visits</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Volume %</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Revenue</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Avg/Visit</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Codes/Visit</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Rate Index</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {payerAnalysis.map(p => {
              const color = scoreColor(p.compositeScore);
              return (
                <tr key={p.payer} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 10px', fontWeight: 600 }}>{p.payer}</td>
                  <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                      fontWeight: 700, fontSize: 12,
                      background: scoreBg(p.compositeScore), color,
                    }}>
                      {p.compositeScore.toFixed(0)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 6px' }}>{p.visits}</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px' }}>{p.volumePct.toFixed(1)}%</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px' }}>{fmt$(p.revenue)}</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: p.avgPerVisit >= overallAvg ? '#16a34a' : '#dc2626' }}>
                    {fmt$(p.avgPerVisit)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 6px' }}>{p.avgCodes.toFixed(1)}</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px', color: p.avgRateStrength >= 100 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {p.avgRateStrength > 0 ? `${p.avgRateStrength.toFixed(0)}%` : '--'}
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600, color }}>
                    {p.recommendation}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 10, fontSize: 11, color: '#9ca3af', lineHeight: 1.6 }}>
          <strong>Score</strong> = weighted: 60% avg revenue/visit, 20% volume, 20% codes/visit.
          <strong> Rate Index</strong> = avg of this payer&apos;s rates vs all-payer avg (100% = at market average).
          <strong> Avg/Visit</strong> colored green if above team avg ({fmt$(overallAvg)}), red if below.
        </div>
      </div>
    </div>
  );
}
