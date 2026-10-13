/**
 * Combo Ranker — estimated-value ranking of timed-code visit combinations.
 *
 * Ranks how 4-unit visits are PAID per payer (so staff can see relative value);
 * it is NOT a directive on what to bill. All pricing comes from rates.js — the
 * only source of truth. Never invent or hardcode a rate here.
 *
 * The hard part is pricing: multi-unit timed codes are NOT always additive.
 * 97530 (TA) bundles DOWN at several payers, while 97110 (TX) / 97112 (NR) stay
 * roughly linear. So n units of a code are priced from the bundled key
 * `${n}${code}` (e.g. "2TA", "4TX") when it exists, falling back to single × n
 * only when no bundled key is present.
 */
import { RATES } from '../data/rates.js';

// Timed therapeutic codes (internal -> CPT). Default visit = 4 units.
export const TIMED_CODES = { TX: '97110', NR: '97112', MT: '97140', TA: '97530' };
export const TIMED = Object.keys(TIMED_CODES); // ['TX','NR','MT','TA']

// PTA/OTA assistant differential. Treatment value is shown at this rate; evals
// (not part of timed enumeration) would stay at 100% on a separate line.
export const PTA_OTA_DIFFERENTIAL = 0.85;

const round2 = (x) => Math.round(x * 100) / 100;

/**
 * Does this combo violate a payer's combo-exclusion rule (so it must be skipped)?
 * - Aetna: Therapeutic Activity (TA, 97530) + Manual Therapy (MT, 97140) cannot
 *   be on the same claim.
 * - Global: 97140 (MT) + 97124 (massage) cannot be billed together. 97124 is not
 *   in this dataset, so this never triggers in the timed enumeration; it is
 *   encoded for completeness / future codes.
 */
export function violatesRules(counts, payer) {
  const has = (c) => (counts[c] || 0) > 0;
  if (payer === 'Aetna' && has('TA') && has('MT')) return true;
  // Global 97140 + 97124 — 97124 absent from TIMED, so a no-op here by design.
  return false;
}

/**
 * Price n units of a timed code for a payer, from rates.js only.
 * Bundled key `${n}${code}` wins when present (captures non-additive bundling);
 * otherwise falls back to single-rate × n. Returns the allowed amount, or 0 when
 * the payer does not cover that unit-count.
 */
export function priceUnits(code, n, payer, rates = RATES) {
  if (n <= 0) return 0;
  const key = n === 1 ? code : `${n}${code}`;
  if (rates[key] && typeof rates[key][payer] === 'number') return rates[key][payer];
  const single = rates[code] && rates[code][payer];
  return single ? single * n : 0;
}

/**
 * Full multiset (combinations_with_replacement) of `units` units over `codes`.
 * Returns count-maps, e.g. { TX: 2, TA: 2 }. Each distinct multiset appears once.
 */
export function enumerateCombos(units = 4, codes = TIMED) {
  const out = [];
  const rec = (i, remaining, counts) => {
    if (remaining === 0) { out.push({ ...counts }); return; }
    if (i >= codes.length) return;
    const code = codes[i];
    for (let n = 0; n <= remaining; n++) {
      if (n > 0) counts[code] = n;
      rec(i + 1, remaining - n, counts);
      delete counts[code];
    }
  };
  rec(0, units, {});
  return out;
}

/**
 * Estimated value of a combo for a payer: sum of bundled unit prices × the
 * PTA/OTA differential. Returns null when not billable — a rule is violated, or
 * any included unit-count is uncovered ($0) so the combo can't be priced as-is.
 */
export function comboValue(counts, payer, rates = RATES) {
  if (violatesRules(counts, payer)) return null;
  let total = 0;
  for (const [code, n] of Object.entries(counts)) {
    const p = priceUnits(code, n, payer, rates);
    if (p <= 0) return null; // uncovered unit-count -> not billable as priced
    total += p;
  }
  return round2(total * PTA_OTA_DIFFERENTIAL);
}

/** Human label for a combo: "3 NR + 1 TA" (most units first). */
export function comboLabel(counts) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || TIMED.indexOf(a[0]) - TIMED.indexOf(b[0]))
    .map(([code, n]) => `${n} ${code}`)
    .join(' + ');
}

/**
 * Ranked value tiers for a payer. Enumerates the full multiset of `units` units
 * over the timed codes, prices each, drops rule violations / uncovered combos,
 * and GROUPS exact-value ties into a single tier. Sorted descending by value.
 * @returns {Array<{ value: number, combos: string[] }>}
 */
export function rankTiers(payer, rates = RATES, { units = 4, codes = TIMED } = {}) {
  const scored = enumerateCombos(units, codes)
    .map((counts) => ({ label: comboLabel(counts), value: comboValue(counts, payer, rates) }))
    .filter((c) => c.value !== null);

  const byValue = new Map();
  for (const c of scored) {
    if (!byValue.has(c.value)) byValue.set(c.value, []);
    byValue.get(c.value).push(c.label);
  }
  return [...byValue.entries()]
    .map(([value, combos]) => ({ value, combos: combos.sort() }))
    .sort((a, b) => b.value - a.value);
}

/** Estimated value of the all-TA visit (e.g. "4 TA"), for the loss comparison. */
export function allTAValue(payer, rates = RATES, units = 4) {
  return comboValue({ TA: units }, payer, rates);
}
