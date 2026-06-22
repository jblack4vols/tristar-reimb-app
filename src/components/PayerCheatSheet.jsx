import { useMemo, useState, useEffect } from 'react';
import { rankTiers } from '../utils/comboRanker';

// Floating, minimizable per-payer cheat sheet. Appears to the right when a payer
// is selected. Shows the top-paying 4-unit timed combos (estimated value — how
// codes are PAID, NOT a directive on what to bill) plus the payer's billing rules.
const MIN_KEY = 'cheatsheet_minimized';

export default function PayerCheatSheet({ payer, rates, billingRules = [] }) {
  const [minimized, setMinimized] = useState(() => {
    try { return localStorage.getItem(MIN_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(MIN_KEY, minimized ? '1' : '0'); } catch { /* ignore */ }
  }, [minimized]);

  const tiers = useMemo(
    () => (payer ? rankTiers(payer, rates, { units: 4 }).slice(0, 4) : []),
    [payer, rates],
  );

  if (!payer) return null;

  const usd = (n) => `$${n.toFixed(2)}`;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        title="Show payer cheat sheet"
        aria-label="Show payer cheat sheet"
        style={{
          position: 'fixed', top: 96, right: 0, zIndex: 50,
          background: '#FF8200', color: '#fff', border: 'none',
          borderRadius: '8px 0 0 8px', padding: '12px 7px', cursor: 'pointer',
          fontWeight: 700, fontSize: 12, writingMode: 'vertical-rl',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        ◂ Cheat Sheet
      </button>
    );
  }

  return (
    <aside
      aria-label={`${payer} cheat sheet`}
      style={{
        position: 'fixed', top: 96, right: 12, zIndex: 50,
        width: 'min(300px, 90vw)', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
        boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', borderBottom: '1px solid #f3f4f6',
          position: 'sticky', top: 0, background: '#fff', borderRadius: '14px 14px 0 0',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a1a' }}>{payer} · Cheat Sheet</div>
        <button
          onClick={() => setMinimized(true)}
          title="Minimize"
          aria-label="Minimize cheat sheet"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, color: '#9ca3af', padding: '0 2px' }}
        >
          –
        </button>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5, marginBottom: 10 }}>
          Top-paying 4-unit timed combos. <strong>Estimated value</strong> (PTA/OTA 0.85) — reflects how codes pay, not a directive on what to bill.
        </div>

        {tiers.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6b7280' }}>No priced timed combos for this payer.</div>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {tiers.map((t, i) => (
              <li key={t.value} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 13, color: '#1a1a1a' }}>
                  <span style={{ color: '#9ca3af', fontWeight: 700, marginRight: 6 }}>{i + 1}.</span>
                  {t.combos[0]}
                  {t.combos.length > 1 && (
                    <span style={{ color: '#9ca3af', fontSize: 11 }}> +{t.combos.length - 1} tie{t.combos.length - 1 > 1 ? 's' : ''}</span>
                  )}
                </span>
                <span style={{ fontWeight: 800, fontSize: 13, color: '#FF8200', flexShrink: 0 }}>{usd(t.value)}</span>
              </li>
            ))}
          </ol>
        )}

        {billingRules.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#78480f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
              Billing rules
            </div>
            {billingRules.map((r, i) => (
              <div key={i} style={{ fontSize: 12, color: '#5c3a0a', lineHeight: 1.5, marginBottom: 3 }}>⚠ {r}</div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
