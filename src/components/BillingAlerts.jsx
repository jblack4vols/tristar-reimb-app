import { useMemo } from 'react';
import { getOptimizationSuggestions, getBillingWarnings } from '../utils/billingOptimizer';

export default function BillingAlerts({ codes, payer, rates, codeLabels, onSwapCode }) {
  const suggestions = useMemo(
    () => getOptimizationSuggestions(codes, payer, rates),
    [codes, payer, rates]
  );

  const warnings = useMemo(
    () => getBillingWarnings(codes, payer, rates),
    [codes, payer, rates]
  );

  if (suggestions.length === 0 && warnings.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Billing Warnings */}
      {warnings.map((w, i) => (
        <div
          key={`w${i}`}
          className={w.type === 'error' ? 'alert-danger' : 'alert-warning'}
          style={{ marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 8 }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>{w.type === 'error' ? '🚫' : '⚠️'}</span>
          <span style={{ fontSize: 13 }}>{w.message}</span>
        </div>
      ))}

      {/* Optimization Suggestions */}
      {suggestions.map((s, i) => (
        <div
          key={`s${i}`}
          style={{
            background: '#eff6ff',
            border: '1.5px solid #bfdbfe',
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 6,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 3 }}>
              Higher Reimbursement Available
            </div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 6 }}>
              {s.hint}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flexWrap: 'wrap' }}>
              <span style={{ color: '#9ca3af' }}>
                <strong>{s.code}</strong> = ${s.currentRate.toFixed(2)}
              </span>
              <span style={{ color: '#9ca3af' }}>→</span>
              <span style={{ color: '#1b5e20', fontWeight: 700 }}>
                <strong>{s.suggestion}</strong> = ${s.suggestedRate.toFixed(2)}
              </span>
              <span className="badge" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontSize: 11 }}>
                +${s.difference.toFixed(2)}
              </span>
            </div>
            {onSwapCode && (
              <button
                className="btn btn-sm"
                style={{ marginTop: 8, background: '#1e40af', color: '#fff', border: 'none', fontSize: 12 }}
                onClick={() => onSwapCode(s.code, s.suggestion)}
              >
                Switch to {s.suggestion}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
