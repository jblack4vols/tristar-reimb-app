import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { useAdminData } from '../../utils/useAdminData';

function fmt$(n) {
  return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pctDiff(a, b) {
  if (!b || b === 0) return null;
  return ((a - b) / b) * 100;
}

export default function PayerNegotiation() {
  const { rates, payers, codeLabels, loading: adminLoading } = useAdminData();
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [period, setPeriod] = useState('365');
  const [focusPayer, setFocusPayer] = useState('');

  useEffect(() => {
    (async () => {
      setLoadingEntries(true);
      let query = supabase.from('billing_entries').select('payer, codes, total, visit_date');
      if (period !== 'all') {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(period));
        query = query.gte('visit_date', d.toISOString().split('T')[0]);
      }
      const { data } = await query;
      setEntries(data || []);
      setLoadingEntries(false);
    })();
  }, [period]);

  // Revenue and volume by payer
  const payerStats = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const p = e.payer || 'Unknown';
      if (!map[p]) map[p] = { visits: 0, revenue: 0, codes: {} };
      map[p].visits += 1;
      map[p].revenue += Number(e.total || 0);
      (e.codes || []).forEach(c => {
        map[p].codes[c] = (map[p].codes[c] || 0) + 1;
      });
    });
    return Object.entries(map)
      .map(([payer, d]) => ({
        payer,
        visits: d.visits,
        revenue: d.revenue,
        avgPerVisit: d.visits > 0 ? d.revenue / d.visits : 0,
        topCodes: Object.entries(d.codes).sort((a, b) => b[1] - a[1]).slice(0, 5),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [entries]);

  // Cross-payer rate comparison for the most-used codes
  const rateComparison = useMemo(() => {
    if (!rates || payers.length === 0) return [];

    // Find top 15 most-billed codes across all payers
    const codeFreq = {};
    entries.forEach(e => {
      (e.codes || []).forEach(c => { codeFreq[c] = (codeFreq[c] || 0) + 1; });
    });
    const topCodes = Object.entries(codeFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([c]) => c);

    return topCodes.map(code => {
      const payerRates = {};
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      let count = 0;

      payers.forEach(p => {
        const rate = (rates[code] || {})[p] || 0;
        payerRates[p] = rate;
        if (rate > 0) {
          min = Math.min(min, rate);
          max = Math.max(max, rate);
          sum += rate;
          count++;
        }
      });

      const avg = count > 0 ? sum / count : 0;
      return {
        code,
        label: codeLabels[code] || '',
        billedCount: codeFreq[code] || 0,
        payerRates,
        min: min === Infinity ? 0 : min,
        max: max === -Infinity ? 0 : max,
        avg,
        spread: max - min,
      };
    });
  }, [rates, payers, entries, codeLabels]);

  // Negotiation opportunities: payers paying below average
  const opportunities = useMemo(() => {
    const opps = [];
    rateComparison.forEach(rc => {
      payers.forEach(p => {
        const rate = rc.payerRates[p] || 0;
        if (rate > 0 && rate < rc.avg * 0.9) {
          // Payer is paying more than 10% below average
          const payerStat = payerStats.find(ps => ps.payer === p);
          const codeBilledForPayer = payerStat?.topCodes?.find(([c]) => c === rc.code);
          const estAnnualVolume = codeBilledForPayer ? codeBilledForPayer[1] : 0;
          const potentialGain = estAnnualVolume * (rc.avg - rate);

          opps.push({
            payer: p,
            code: rc.code,
            codeLabel: rc.label,
            currentRate: rate,
            avgRate: rc.avg,
            maxRate: rc.max,
            gap: rc.avg - rate,
            pctBelow: pctDiff(rate, rc.avg),
            estAnnualVolume,
            potentialGain,
          });
        }
      });
    });
    return opps.sort((a, b) => b.potentialGain - a.potentialGain).slice(0, 20);
  }, [rateComparison, payers, payerStats]);

  const totalPotentialGain = opportunities.reduce((s, o) => s + o.potentialGain, 0);

  const exportPDF = useCallback(async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF('landscape');

    // Title
    doc.setFontSize(18);
    doc.setTextColor(255, 130, 0);
    doc.text('Tristar Physical Therapy', 14, 18);
    doc.setFontSize(14);
    doc.setTextColor(26, 26, 26);
    doc.text('Payer Rate Negotiation Report', 14, 28);
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Period: ${period === 'all' ? 'All Time' : period + ' days'}`, 14, 35);
    doc.text(`Estimated Annual Opportunity: ${fmt$(totalPotentialGain)}`, 14, 42);

    // Negotiation targets table
    if (opportunities.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(26, 26, 26);
      doc.text('Top Negotiation Targets', 14, 52);

      autoTable(doc, {
        startY: 56,
        head: [['Payer', 'Code', 'Description', 'Their Rate', 'Market Avg', 'Best Rate', 'Gap', 'Est. Annual Gain']],
        body: opportunities.map(o => [
          o.payer, o.code, o.codeLabel,
          fmt$(o.currentRate), fmt$(o.avgRate), fmt$(o.maxRate),
          `-${fmt$(o.gap)}`, o.potentialGain > 0 ? fmt$(o.potentialGain) : '--',
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [255, 130, 0] },
      });
    }

    // Cross-payer rate comparison
    const y = doc.previousAutoTable ? doc.previousAutoTable.finalY + 12 : 60;
    doc.setFontSize(12);
    doc.setTextColor(26, 26, 26);
    doc.text('Cross-Payer Rate Comparison (Top 15 Codes)', 14, y);

    doc.autoTable({
      startY: y + 4,
      head: [['Code', 'Description', 'Times Billed', 'Min Rate', 'Avg Rate', 'Max Rate', 'Spread']],
      body: rateComparison.map(rc => [
        rc.code, rc.label, rc.billedCount,
        fmt$(rc.min), fmt$(rc.avg), fmt$(rc.max), fmt$(rc.spread),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 130, 0] },
    });

    // Payer volume summary
    const y2 = doc.previousAutoTable.finalY + 12;
    if (y2 < 170) {
      doc.text('Payer Volume & Revenue', 14, y2);
      autoTable(doc, {
        startY: y2 + 4,
        head: [['Payer', 'Visits', 'Revenue', 'Avg/Visit']],
        body: payerStats.map(p => [p.payer, p.visits, fmt$(p.revenue), fmt$(p.avgPerVisit)]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [255, 130, 0] },
      });
    }

    doc.save(`tristar-negotiation-report-${new Date().toISOString().split('T')[0]}.pdf`);
  }, [opportunities, rateComparison, payerStats, totalPotentialGain, period]);

  if (adminLoading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>Payer Rate Negotiation Report</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {['90', '180', '365', 'all'].map(p => (
            <button key={p} className={`group-pill${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
              {p === 'all' ? 'All Time' : `${p}d`}
            </button>
          ))}
          <button className="btn btn-primary btn-sm" onClick={exportPDF} disabled={loadingEntries || entries.length === 0}>
            Export PDF
          </button>
        </div>
      </div>

      {loadingEntries && <div style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontSize: 13 }}>Loading billing data...</div>}

      {/* Negotiation Opportunities */}
      {opportunities.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="revenue-card" style={{ marginBottom: 16 }}>
            <div className="total-label">Estimated Annual Revenue Opportunity</div>
            <div className="total-amount">{fmt$(totalPotentialGain)}</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
              If below-average payer rates were negotiated to the market average
            </div>
          </div>

          <div className="field-label" style={{ marginBottom: 8 }}>Top Negotiation Targets</div>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Payer</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Code</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Their Rate</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Market Avg</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Best Rate</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#dc2626', fontSize: 11, textTransform: 'uppercase' }}>Gap</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 700, color: '#16a34a', fontSize: 11, textTransform: 'uppercase' }}>Est. Annual Gain</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((o, i) => (
                  <tr key={`${o.payer}-${o.code}`} style={{ borderBottom: '1px solid #f3f4f6', background: i < 3 ? '#fefce8' : undefined }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{o.payer}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={{ fontWeight: 700 }}>{o.code}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>{o.codeLabel}</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: '#dc2626', fontWeight: 700 }}>{fmt$(o.currentRate)}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px' }}>{fmt$(o.avgRate)}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: '#16a34a' }}>{fmt$(o.maxRate)}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: '#dc2626', fontWeight: 700 }}>
                      -{fmt$(o.gap)} ({o.pctBelow !== null ? o.pctBelow.toFixed(0) : '?'}%)
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 700, color: '#16a34a' }}>
                      {o.potentialGain > 0 ? fmt$(o.potentialGain) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payer Volume & Revenue Summary */}
      <div className="field-label" style={{ marginBottom: 8 }}>Payer Volume & Revenue</div>
      <div className="card" style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Payer</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Visits</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Revenue</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Avg/Visit</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Top Codes</th>
            </tr>
          </thead>
          <tbody>
            {payerStats.map(p => (
              <tr key={p.payer} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: focusPayer === p.payer ? '#fff8f0' : undefined }} onClick={() => setFocusPayer(focusPayer === p.payer ? '' : p.payer)}>
                <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.payer}</td>
                <td style={{ textAlign: 'right', padding: '8px 6px' }}>{p.visits}</td>
                <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700 }}>{fmt$(p.revenue)}</td>
                <td style={{ textAlign: 'right', padding: '8px 6px', color: '#FF8200', fontWeight: 700 }}>{fmt$(p.avgPerVisit)}</td>
                <td style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {p.topCodes.map(([code, count]) => (
                      <span key={code} className="badge" style={{ fontSize: 10, padding: '2px 6px' }}>
                        {code} ({count})
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cross-Payer Rate Comparison */}
      <div className="field-label" style={{ marginBottom: 8 }}>Cross-Payer Rate Comparison (Top 15 Billed Codes)</div>
      <div className="rate-table-wrap" style={{ marginBottom: 24 }}>
        <table className="rate-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', minWidth: 140 }}>Code</th>
              <th>Billed</th>
              <th>Min Rate</th>
              <th>Avg Rate</th>
              <th>Max Rate</th>
              <th>Spread</th>
            </tr>
          </thead>
          <tbody>
            {rateComparison.map(rc => (
              <tr key={rc.code}>
                <td style={{ textAlign: 'left' }}>
                  <span style={{ fontWeight: 700 }}>{rc.code}</span>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{rc.label}</div>
                </td>
                <td>{rc.billedCount}</td>
                <td style={{ color: '#dc2626' }}>{fmt$(rc.min)}</td>
                <td style={{ fontWeight: 700 }}>{fmt$(rc.avg)}</td>
                <td style={{ color: '#16a34a' }}>{fmt$(rc.max)}</td>
                <td style={{ color: rc.spread > rc.avg * 0.3 ? '#dc2626' : '#6b7280', fontWeight: 700 }}>
                  {fmt$(rc.spread)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loadingEntries && entries.length === 0 && (
        <div className="alert-warning">No billing data found for this period. Log visits to generate negotiation insights.</div>
      )}
    </div>
  );
}
