import { useState, useMemo } from 'react';

/* ── CMS 8-Minute Rule ranges ── */
const RULE_RANGES = [
  { min: 8,   max: 22,  units: 1 },
  { min: 23,  max: 37,  units: 2 },
  { min: 38,  max: 52,  units: 3 },
  { min: 53,  max: 67,  units: 4 },
  { min: 68,  max: 82,  units: 5 },
  { min: 83,  max: 97,  units: 6 },
  { min: 98,  max: 112, units: 7 },
  { min: 113, max: 127, units: 8 },
];

/* ── Timed code base keys (each unit = 15 min) ── */
const TIMED_BASES = ['TX', 'NR', 'MT', 'GT', 'TA', 'AQ'];

const TIMED_LABELS = {
  TX: 'Therapeutic Exercise',
  NR: 'Neuromuscular Re-ed',
  MT: 'Manual Therapy',
  GT: 'Gait Training',
  TA: 'Therapeutic Activity',
  AQ: 'Aquatic Therapy',
};

/**
 * Check whether a code is a timed code.
 * Timed codes include the base (TX) and multi-unit variants (2TX, 3TX, 4TX).
 */
function isTimedCode(code) {
  return TIMED_BASES.some(base => {
    if (code === base) return true;
    // Match multi-unit variants like 2TX, 3TX, 4TX, AQ2, AQ3, etc.
    const stripped = code.replace(/^\d+/, '');
    const suffix = code.replace(/[A-Z]+\d*$/, '');
    return stripped === base || (base === 'AQ' && code.startsWith('AQ') && /^AQ\d+$/.test(code));
  });
}

/**
 * Get the base timed code name and unit count for a given code.
 * e.g., "3TX" -> { base: "TX", units: 3 }
 *       "TX"  -> { base: "TX", units: 1 }
 *       "AQ3" -> { base: "AQ", units: 3 }
 */
function parseTimedCode(code) {
  // Handle AQ variants: AQ, AQ2, AQ3, AQ4, AQ5
  if (code === 'AQ') return { base: 'AQ', units: 1 };
  if (/^AQ\d+$/.test(code)) return { base: 'AQ', units: parseInt(code.slice(2), 10) };

  // Handle prefix-number variants: 2TX, 3MT, 4NR, etc.
  for (const base of TIMED_BASES) {
    if (code === base) return { base, units: 1 };
    const match = code.match(new RegExp(`^(\\d+)${base}$`));
    if (match) return { base, units: parseInt(match[1], 10) };
  }
  return null;
}

/**
 * Given total minutes, return how many billable units per the 8-minute rule.
 */
function getBillableUnits(totalMinutes) {
  if (totalMinutes < 8) return 0;
  for (let i = RULE_RANGES.length - 1; i >= 0; i--) {
    if (totalMinutes >= RULE_RANGES[i].min) return RULE_RANGES[i].units;
  }
  // Beyond table — extrapolate: each additional 15 min = 1 more unit
  return Math.floor(totalMinutes / 15) + (totalMinutes % 15 >= 8 ? 1 : 0);
}

export default function EightMinuteRule({ codes }) {
  const [totalMinutes, setTotalMinutes] = useState('');

  const { timedCodes, untimedCodes } = useMemo(() => {
    const timed = [];
    const untimed = [];
    (codes || []).forEach(c => {
      const parsed = parseTimedCode(c);
      if (parsed) {
        timed.push({ code: c, ...parsed });
      } else {
        untimed.push(c);
      }
    });
    return { timedCodes: timed, untimedCodes: untimed };
  }, [codes]);

  const minutes = parseInt(totalMinutes, 10) || 0;
  const billableUnits = getBillableUnits(minutes);

  // Total units selected across timed codes
  const totalSelectedUnits = timedCodes.reduce((sum, t) => sum + t.units, 0);

  // Distribute billable units across timed code bases proportionally
  const allocation = useMemo(() => {
    if (timedCodes.length === 0 || billableUnits === 0) return [];

    // Group by base code and sum their selected units
    const baseMap = {};
    timedCodes.forEach(({ base, units }) => {
      if (!baseMap[base]) baseMap[base] = { base, selectedUnits: 0 };
      baseMap[base].selectedUnits += units;
    });
    const bases = Object.values(baseMap);

    // Distribute billable units proportionally based on selected units
    let remaining = billableUnits;
    const result = bases.map(b => {
      const proportion = totalSelectedUnits > 0
        ? Math.round((b.selectedUnits / totalSelectedUnits) * billableUnits)
        : Math.floor(billableUnits / bases.length);
      return { ...b, allocated: proportion };
    });

    // Correct rounding errors
    const totalAllocated = result.reduce((s, r) => s + r.allocated, 0);
    const diff = billableUnits - totalAllocated;
    if (diff !== 0) {
      // Give/take from the code with the most selected units
      result.sort((a, b) => b.selectedUnits - a.selectedUnits);
      result[0].allocated += diff;
    }

    // Cap each code's allocated units to billableUnits (sanity)
    result.forEach(r => { r.allocated = Math.max(0, Math.min(r.allocated, billableUnits)); });

    return result.sort((a, b) => b.allocated - a.allocated);
  }, [timedCodes, billableUnits, totalSelectedUnits]);

  const activeRange = RULE_RANGES.find(r => minutes >= r.min && minutes <= r.max);

  return (
    <div className="card-surface" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(255,130,0,0.12)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0,
        }}>
          8
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>
            CMS 8-Minute Rule
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Timed code unit calculator for Medicare billing
          </div>
        </div>
      </div>

      {/* Selected code classification */}
      {(codes || []).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {timedCodes.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#6b7280',
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6,
              }}>
                Timed Codes Selected
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {timedCodes.map(t => (
                  <span key={t.code} className="badge" style={{
                    background: 'rgba(255,130,0,0.12)', color: '#FF8200',
                    border: '1px solid rgba(255,130,0,0.28)',
                  }}>
                    {t.code} ({t.units}u)
                  </span>
                ))}
              </div>
            </div>
          )}
          {untimedCodes.length > 0 && (
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#6b7280',
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6,
              }}>
                Untimed Codes (flat rate)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {untimedCodes.map(c => (
                  <span key={c} className="badge" style={{
                    background: '#f3f4f6', color: '#6b7280',
                    border: '1px solid #e5e7eb',
                  }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No timed codes message */}
      {timedCodes.length === 0 && (
        <div style={{
          background: '#f9fafb', border: '1.5px dashed #d1d5db',
          borderRadius: 10, padding: '14px 16px', marginBottom: 14,
          fontSize: 13, color: '#9ca3af', textAlign: 'center',
        }}>
          No timed codes selected. The 8-minute rule applies to timed CPT codes:
          <span style={{ fontWeight: 700, color: '#6b7280', marginLeft: 4 }}>
            TX, NR, MT, GT, TA, AQ
          </span>
        </div>
      )}

      {/* Total Treatment Time input */}
      {timedCodes.length > 0 && (
        <>
          <div style={{ maxWidth: 240, marginBottom: 14 }}>
            <label className="field-label">Total Treatment Time (minutes)</label>
            <input
              type="number"
              min="0"
              max="240"
              inputMode="numeric"
              placeholder="e.g. 45"
              value={totalMinutes}
              onChange={e => setTotalMinutes(e.target.value)}
              style={{ borderColor: minutes > 0 ? '#FF8200' : undefined }}
            />
          </div>

          {/* Result */}
          {minutes > 0 && (
            <div style={{
              background: '#fff', borderRadius: 12, padding: 14,
              border: '1.5px solid rgba(255,130,0,0.28)', marginBottom: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Billable Units</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#FF8200' }}>
                    {billableUnits} unit{billableUnits !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Treatment Time</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>
                    {minutes} min
                  </div>
                </div>
              </div>

              {minutes > 0 && minutes < 8 && (
                <div style={{
                  fontSize: 13, color: '#b71c1c', background: '#fef2f2',
                  padding: '8px 12px', borderRadius: 8,
                }}>
                  Below 8 minutes — cannot bill any timed units.
                </div>
              )}

              {/* Unit allocation breakdown */}
              {allocation.length > 0 && (
                <div style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 10, paddingTop: 10 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: '#6b7280',
                    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8,
                  }}>
                    Unit Allocation
                  </div>
                  {allocation.map(a => (
                    <div key={a.base} style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '6px 0',
                      borderBottom: '1px solid #f3f4f6',
                    }}>
                      <div style={{ fontSize: 14 }}>
                        <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{a.base}</span>
                        <span style={{ color: '#6b7280', marginLeft: 6, fontSize: 12 }}>
                          {TIMED_LABELS[a.base]}
                        </span>
                      </div>
                      <div style={{
                        fontWeight: 800, fontSize: 15, color: '#FF8200',
                        minWidth: 60, textAlign: 'right',
                      }}>
                        {a.allocated} unit{a.allocated !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                  {billableUnits < totalSelectedUnits && (
                    <div style={{
                      fontSize: 12, color: '#b45309', background: '#fffbeb',
                      padding: '8px 12px', borderRadius: 8, marginTop: 8,
                    }}>
                      You selected {totalSelectedUnits} unit(s) of timed codes but only {billableUnits} unit(s) are billable for {minutes} minutes of treatment.
                    </div>
                  )}
                  {billableUnits > totalSelectedUnits && (
                    <div style={{
                      fontSize: 12, color: '#166534', background: '#f0fdf4',
                      padding: '8px 12px', borderRadius: 8, marginTop: 8,
                    }}>
                      You could bill up to {billableUnits} unit(s) for {minutes} minutes, but only {totalSelectedUnits} timed unit(s) selected.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Reference table */}
      <div>
        <div style={{
          fontSize: 11, fontWeight: 700, color: '#6b7280',
          letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          8-Minute Rule Reference
        </div>
        <div className="grid-2" style={{ gap: 4 }}>
          {RULE_RANGES.map(r => {
            const isActive = activeRange && r.units === activeRange.units;
            return (
              <div key={r.units} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '7px 10px',
                borderRadius: 8, fontSize: 13,
                background: isActive ? 'rgba(255,130,0,0.10)' : '#fff',
                border: isActive ? '1.5px solid rgba(255,130,0,0.35)' : '1px solid #e5e7eb',
                fontWeight: isActive ? 700 : 400,
                color: isActive ? '#FF8200' : '#1a1a1a',
              }}>
                <span>{r.min}–{r.max} min</span>
                <span>{r.units} unit{r.units !== 1 ? 's' : ''}</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
          Below 8 min = 0 units. Each 15-min increment adds 1 unit; the last unit requires at least 8 min.
        </div>
      </div>
    </div>
  );
}
