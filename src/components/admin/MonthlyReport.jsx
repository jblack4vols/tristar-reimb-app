import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { useAdminData } from '../../utils/useAdminData';
import { decryptPHI } from '../../utils/crypto';

const BRAND = '#FF8200';
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const fmt = n => `$${Number(n || 0).toFixed(2)}`;

function getDefaultMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return { month: d.getMonth(), year: d.getFullYear() };
}

export default function MonthlyReport() {
  const { _rates, _payers, _allProviders, codeLabels, loading } = useAdminData();
  const [month, setMonth] = useState(getDefaultMonth().month);
  const [year, setYear] = useState(getDefaultMonth().year);
  const [visits, setVisits] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Fetch visits for selected month
  useEffect(() => {
    (async () => {
      setFetching(true);
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endMonth = month === 11 ? 0 : month + 1;
      const endYear = month === 11 ? year + 1 : year;
      const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`;

      const { data } = await supabase
        .from('billing_entries')
        .select('*')
        .gte('visit_date', startDate)
        .lt('visit_date', endDate)
        .order('visit_date', { ascending: false });

      setVisits((data || []).map(e => ({ ...e, patient_name: decryptPHI(e.patient_name) })));
      setFetching(false);
    })();
  }, [month, year]);

  // ── Computed Report Data ──────────────────────────
  const reportData = useMemo(() => {
    const totalRevenue = visits.reduce((s, v) => s + Number(v.total || 0), 0);
    const totalVisits = visits.length;
    const avgPerVisit = totalVisits > 0 ? totalRevenue / totalVisits : 0;
    const uniquePatients = new Set(visits.map(v => (v.patient_name || '').toLowerCase())).size;

    // Revenue by Location
    const locMap = {};
    visits.forEach(v => {
      const loc = v.location || 'Unknown';
      if (!locMap[loc]) locMap[loc] = { total: 0, count: 0 };
      locMap[loc].total += Number(v.total || 0);
      locMap[loc].count += 1;
    });
    const byLocation = Object.entries(locMap)
      .map(([loc, d]) => ({ location: loc, total: d.total, count: d.count, avg: d.count > 0 ? d.total / d.count : 0 }))
      .sort((a, b) => b.total - a.total);

    // Revenue by Provider
    const provMap = {};
    visits.forEach(v => {
      const prov = v.provider || 'Unassigned';
      if (!provMap[prov]) provMap[prov] = { total: 0, count: 0 };
      provMap[prov].total += Number(v.total || 0);
      provMap[prov].count += 1;
    });
    const byProvider = Object.entries(provMap)
      .map(([prov, d]) => ({ provider: prov, total: d.total, count: d.count, avg: d.count > 0 ? d.total / d.count : 0 }))
      .sort((a, b) => b.total - a.total);

    // Revenue by Payer
    const payerMap = {};
    visits.forEach(v => {
      const p = v.payer || 'Unknown';
      if (!payerMap[p]) payerMap[p] = { total: 0, count: 0 };
      payerMap[p].total += Number(v.total || 0);
      payerMap[p].count += 1;
    });
    const byPayer = Object.entries(payerMap)
      .map(([payer, d]) => ({
        payer, total: d.total, count: d.count,
        avg: d.count > 0 ? d.total / d.count : 0,
        pct: totalRevenue > 0 ? (d.total / totalRevenue * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Top 10 Billed Codes
    const codeFreq = {};
    visits.forEach(v => {
      (v.codes || []).forEach(code => {
        if (!codeFreq[code]) codeFreq[code] = { count: 0 };
        codeFreq[code].count += 1;
      });
    });
    const topCodes = Object.entries(codeFreq)
      .map(([code, d]) => ({ code, label: codeLabels[code] || '', count: d.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { totalRevenue, totalVisits, avgPerVisit, uniquePatients, byLocation, byProvider, byPayer, topCodes };
  }, [visits, codeLabels]);

  const monthLabel = `${MONTHS[month]} ${year}`;

  // ── PDF Generation ────────────────────────────────
  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    const { totalRevenue, totalVisits, avgPerVisit, uniquePatients, byLocation, byProvider, byPayer, topCodes } = reportData;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(255, 130, 0);
    doc.text('Tristar Physical Therapy', 14, 20);
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text(`Monthly Report \u2014 ${monthLabel}`, 14, 28);

    // Executive Summary
    let y = 40;
    doc.setFontSize(12);
    doc.setTextColor(255, 130, 0);
    doc.text('Executive Summary', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Visits: ${totalVisits}`, 14, y); y += 6;
    doc.text(`Total Revenue: ${fmt(totalRevenue)}`, 14, y); y += 6;
    doc.text(`Average per Visit: ${fmt(avgPerVisit)}`, 14, y); y += 6;
    doc.text(`Unique Patients: ${uniquePatients}`, 14, y); y += 12;

    // Revenue by Location
    doc.setFontSize(12);
    doc.setTextColor(255, 130, 0);
    doc.text('Revenue by Location', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Location', 'Visits', 'Total Revenue', 'Avg/Visit']],
      body: byLocation.map(r => [r.location, r.count, fmt(r.total), fmt(r.avg)]),
      headStyles: { fillColor: [255, 130, 0], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Revenue by Provider
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setTextColor(255, 130, 0);
    doc.text('Revenue by Provider', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Provider', 'Visits', 'Total Revenue', 'Avg/Visit']],
      body: byProvider.map(r => [r.provider, r.count, fmt(r.total), fmt(r.avg)]),
      headStyles: { fillColor: [255, 130, 0], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Revenue by Payer
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setTextColor(255, 130, 0);
    doc.text('Revenue by Payer', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Payer', 'Visits', 'Total Revenue', 'Avg/Visit']],
      body: byPayer.map(r => [r.payer, r.count, fmt(r.total), fmt(r.avg)]),
      headStyles: { fillColor: [255, 130, 0], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Top 10 Billed Codes
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setTextColor(255, 130, 0);
    doc.text('Top 10 Billed Codes', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Code', 'Description', 'Times Billed']],
      body: topCodes.map(r => [r.code, r.label, r.count]),
      headStyles: { fillColor: [255, 130, 0], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Payer Mix
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setTextColor(255, 130, 0);
    doc.text('Payer Mix', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Payer', 'Revenue', '% of Total']],
      body: byPayer.map(r => [r.payer, fmt(r.total), `${r.pct.toFixed(1)}%`]),
      headStyles: { fillColor: [255, 130, 0], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated ${new Date().toISOString().slice(0, 10)} | Tristar Physical Therapy | Page ${i} of ${pageCount}`,
        14, pageH - 10
      );
    }

    doc.save(`tristar-monthly-report-${year}-${String(month + 1).padStart(2, '0')}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Years range for selector ──────────────────────
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 3; y <= currentYear; y++) years.push(y);

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</div>;

  const { totalRevenue, totalVisits, avgPerVisit, uniquePatients, byLocation, byProvider, byPayer, topCodes } = reportData;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>Monthly Report</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={downloadPDF} disabled={fetching || pdfLoading || totalVisits === 0}>
            {pdfLoading ? 'Preparing PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {fetching && <div style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontSize: 13 }}>Loading visit data...</div>}

      {!fetching && totalVisits === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>
          No billing entries found for {monthLabel}.
        </div>
      )}

      {!fetching && totalVisits > 0 && (
        <>
          {/* Executive Summary Cards */}
          <div className="section-head" style={{ fontSize: 14 }}>Executive Summary</div>
          <div className="grid-3" style={{ gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Visits', value: totalVisits },
              { label: 'Total Revenue', value: fmt(totalRevenue) },
              { label: 'Avg per Visit', value: fmt(avgPerVisit) },
              { label: 'Unique Patients', value: uniquePatients },
            ].map(s => (
              <div className="card" key={s.label} style={{ textAlign: 'center' }}>
                <div className="field-label">{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: BRAND, marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Revenue by Location */}
          <div className="section-head" style={{ fontSize: 14 }}>Revenue by Location</div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="rate-table-wrap">
              <table className="rate-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Location</th>
                    <th style={{ textAlign: 'right' }}>Visits</th>
                    <th style={{ textAlign: 'right' }}>Total Revenue</th>
                    <th style={{ textAlign: 'right' }}>Avg/Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {byLocation.map(r => (
                    <tr key={r.location}>
                      <td style={{ fontWeight: 600 }}>{r.location}</td>
                      <td style={{ textAlign: 'right' }}>{r.count}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(r.total)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(r.avg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue by Provider */}
          <div className="section-head" style={{ fontSize: 14 }}>Revenue by Provider</div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="rate-table-wrap">
              <table className="rate-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Provider</th>
                    <th style={{ textAlign: 'right' }}>Visits</th>
                    <th style={{ textAlign: 'right' }}>Total Revenue</th>
                    <th style={{ textAlign: 'right' }}>Avg/Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {byProvider.map(r => (
                    <tr key={r.provider}>
                      <td style={{ fontWeight: 600 }}>{r.provider}</td>
                      <td style={{ textAlign: 'right' }}>{r.count}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(r.total)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(r.avg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue by Payer */}
          <div className="section-head" style={{ fontSize: 14 }}>Revenue by Payer</div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="rate-table-wrap">
              <table className="rate-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Payer</th>
                    <th style={{ textAlign: 'right' }}>Visits</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>Avg/Visit</th>
                    <th style={{ textAlign: 'right' }}>% Mix</th>
                  </tr>
                </thead>
                <tbody>
                  {byPayer.map(r => (
                    <tr key={r.payer}>
                      <td style={{ fontWeight: 600 }}>{r.payer}</td>
                      <td style={{ textAlign: 'right' }}>{r.count}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(r.total)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(r.avg)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="badge">{r.pct.toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top 10 Codes */}
          <div className="section-head" style={{ fontSize: 14 }}>Top 10 Billed Codes</div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="rate-table-wrap">
              <table className="rate-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Code</th>
                    <th style={{ textAlign: 'left' }}>Description</th>
                    <th style={{ textAlign: 'right' }}>Times Billed</th>
                  </tr>
                </thead>
                <tbody>
                  {topCodes.map(r => (
                    <tr key={r.code}>
                      <td style={{ fontWeight: 600 }}>{r.code}</td>
                      <td style={{ color: '#6b7280' }}>{r.label}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
