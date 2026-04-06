import { useState, useMemo } from 'react';
import { useAdminData } from '../../utils/useAdminData';
import { supabase } from '../../utils/supabase';

const BRAND = '#FF8200';

const VISIT_TEMPLATES = {
  'Standard PT Visit': ['97110', '97140', '97530'],
  'Eval + Treat': ['EVAL-62', '97110', '97140'],
  'Aquatic Visit': ['97113', '97110'],
  'Manual Therapy Focus': ['97140', '97530', '97110'],
  'Dry Needling Visit': ['97799', '97110', '97140'],
};

const fmt = n => (n != null && !isNaN(n)) ? `$${Number(n).toFixed(2)}` : '—';

export default function PayerComparison() {
  const { rates, payers, codeLabels, codeGroups, loading } = useAdminData();
  const [selectedPayers, setSelectedPayers] = useState([]);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [template, setTemplate] = useState('');
  const [showPayerPicker, setShowPayerPicker] = useState(false);
  const [showCodePicker, setShowCodePicker] = useState(false);

  // All available code keys
  const allCodes = useMemo(() => {
    const codeSet = new Set();
    Object.values(rates || {}).forEach(payerRates => {
      Object.keys(payerRates).forEach(code => codeSet.add(code));
    });
    return [...codeSet].sort();
  }, [rates]);

  // Payer names
  const payerNames = useMemo(() => {
    return (payers || []).map(p => p.name || p).sort();
  }, [payers]);

  // Toggle a payer
  const togglePayer = (name) => {
    setSelectedPayers(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  // Toggle a code
  const toggleCode = (code) => {
    setSelectedCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // Apply template
  const applyTemplate = (tplName) => {
    setTemplate(tplName);
    if (VISIT_TEMPLATES[tplName]) {
      setSelectedCodes(VISIT_TEMPLATES[tplName]);
    }
  };

  // Build comparison data
  const comparison = useMemo(() => {
    if (selectedPayers.length < 2 || selectedCodes.length === 0) return null;

    const rows = selectedCodes.map(code => {
      const ratesByPayer = {};
      let max = -Infinity;
      let min = Infinity;
      selectedPayers.forEach(payer => {
        const r = (rates[code] || {})[payer] || 0;
        ratesByPayer[payer] = r;
        if (r > max) max = r;
        if (r < min) min = r;
      });
      return { code, label: codeLabels[code] || '', ratesByPayer, max, min };
    });

    // Totals per payer
    const totals = {};
    selectedPayers.forEach(payer => {
      totals[payer] = rows.reduce((sum, row) => sum + (row.ratesByPayer[payer] || 0), 0);
    });

    const bestPayer = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    const worstPayer = Object.entries(totals).sort((a, b) => a[1] - b[1])[0];
    const diff = (bestPayer?.[1] || 0) - (worstPayer?.[1] || 0);

    return { rows, totals, bestPayer, worstPayer, diff };
  }, [selectedPayers, selectedCodes, rates, codeLabels]);

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</div>;

  return (
    <div>
      <div className="section-head">Payer Comparison Tool</div>

      <div className="grid-2" style={{ gap: 16, marginBottom: 20 }}>
        {/* Payer Selection */}
        <div className="card">
          <div className="field-label" style={{ marginBottom: 8 }}>
            Select Payers (2+)
            <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => setShowPayerPicker(!showPayerPicker)}>
              {showPayerPicker ? 'Hide' : 'Choose'}
            </button>
            {selectedPayers.length > 0 && (
              <button className="btn btn-sm" style={{ marginLeft: 6 }} onClick={() => setSelectedPayers([])}>
                Clear
              </button>
            )}
          </div>
          {selectedPayers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {selectedPayers.map(p => (
                <span key={p} className="badge" style={{ cursor: 'pointer' }} onClick={() => togglePayer(p)}>
                  {p} &times;
                </span>
              ))}
            </div>
          )}
          {showPayerPicker && (
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, fontSize: 13 }}>
              {payerNames.map(name => (
                <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedPayers.includes(name)}
                    onChange={() => togglePayer(name)}
                  />
                  {name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Code Selection */}
        <div className="card">
          <div className="field-label" style={{ marginBottom: 8 }}>
            Select Codes
            <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => setShowCodePicker(!showCodePicker)}>
              {showCodePicker ? 'Hide' : 'Choose'}
            </button>
            {selectedCodes.length > 0 && (
              <button className="btn btn-sm" style={{ marginLeft: 6 }} onClick={() => setSelectedCodes([])}>
                Clear
              </button>
            )}
          </div>

          {/* Templates */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#6b7280', marginRight: 6 }}>Templates:</span>
            {Object.keys(VISIT_TEMPLATES).map(tpl => (
              <button
                key={tpl}
                className={`btn btn-sm`}
                style={{
                  marginRight: 4, marginBottom: 4, fontSize: 11,
                  background: template === tpl ? BRAND : undefined,
                  color: template === tpl ? '#fff' : undefined,
                }}
                onClick={() => applyTemplate(tpl)}
              >
                {tpl}
              </button>
            ))}
          </div>

          {selectedCodes.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {selectedCodes.map(c => (
                <span key={c} className="badge" style={{ cursor: 'pointer' }} onClick={() => toggleCode(c)}>
                  {c} &times;
                </span>
              ))}
            </div>
          )}
          {showCodePicker && (
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, fontSize: 13 }}>
              {allCodes.map(code => (
                <label key={code} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedCodes.includes(code)}
                    onChange={() => toggleCode(code)}
                  />
                  <strong>{code}</strong>
                  <span style={{ color: '#6b7280', fontSize: 12 }}>{codeLabels[code] || ''}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Validation */}
      {selectedPayers.length < 2 && (
        <div className="card" style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>
          Select at least 2 payers to compare.
        </div>
      )}
      {selectedPayers.length >= 2 && selectedCodes.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>
          Select codes or a template to compare rates.
        </div>
      )}

      {/* Comparison Table */}
      {comparison && (
        <>
          {/* Best Payer Summary */}
          <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #22c55e' }}>
              <div className="field-label">Best Payer for This Visit</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e', marginTop: 4 }}>
                {comparison.bestPayer?.[0] || '—'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>
                {fmt(comparison.bestPayer?.[1])}
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
              <div className="field-label">Difference (Best vs Worst)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>
                {fmt(comparison.diff)}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                {comparison.worstPayer?.[0] || '—'} pays the least
              </div>
            </div>
          </div>

          <div className="rate-table-wrap">
            <table className="rate-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Code</th>
                  <th style={{ textAlign: 'left' }}>Description</th>
                  {selectedPayers.map(p => (
                    <th key={p} style={{ textAlign: 'right' }}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map(row => (
                  <tr key={row.code}>
                    <td style={{ fontWeight: 600 }}>{row.code}</td>
                    <td style={{ color: '#6b7280', fontSize: 12 }}>{row.label}</td>
                    {selectedPayers.map(payer => {
                      const val = row.ratesByPayer[payer] || 0;
                      const isMax = val > 0 && val === row.max;
                      const isMin = val >= 0 && val === row.min && row.max !== row.min;
                      return (
                        <td
                          key={payer}
                          style={{
                            textAlign: 'right',
                            fontWeight: 600,
                            color: isMax ? '#16a34a' : isMin ? '#dc2626' : undefined,
                            background: isMax ? '#f0fdf4' : isMin ? '#fef2f2' : undefined,
                          }}
                        >
                          {val > 0 ? fmt(val) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Total Row */}
                <tr style={{ borderTop: '2px solid #e5e7eb', fontWeight: 700 }}>
                  <td colSpan={2} style={{ fontWeight: 700 }}>TOTAL</td>
                  {selectedPayers.map(payer => {
                    const total = comparison.totals[payer];
                    const maxTotal = Math.max(...Object.values(comparison.totals));
                    const minTotal = Math.min(...Object.values(comparison.totals));
                    const isMax = total === maxTotal;
                    const isMin = total === minTotal && maxTotal !== minTotal;
                    return (
                      <td
                        key={payer}
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: 14,
                          color: isMax ? '#16a34a' : isMin ? '#dc2626' : undefined,
                          background: isMax ? '#f0fdf4' : isMin ? '#fef2f2' : undefined,
                        }}
                      >
                        {fmt(total)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
