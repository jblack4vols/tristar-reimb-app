import { useMemo } from 'react';
import { getBillingWarnings } from '../utils/billingOptimizer';

export default function BillingAlerts({ codes, payer, rates, _codeLabels }) {
  const warnings = useMemo(() => {
    try {
      return getBillingWarnings(codes || [], payer || '', rates || {});
    } catch (e) {
      console.error('BillingAlerts error:', e);
      return [];
    }
  }, [codes, payer, rates]);

  if (!warnings || warnings.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
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
    </div>
  );
}
