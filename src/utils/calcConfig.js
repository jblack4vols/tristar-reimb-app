// ============================================================
// Calculator billing policy + rate-resolution helpers
//
// App-level billing logic that the admin/Supabase data model does NOT
// cover: unit-stepper resolution, flat-rate payers, special-case payers,
// and the Tier-1 payer rule engine. Per-code dollar amounts still come
// from admin-managed rates (useAdminData) — these constants layer on top.
//
// Kept here (not in a component) so the logic is unit-testable and shared.
// ============================================================

// Flat per-day payers — total is fixed regardless of which codes are billed.
// strappingBonus (Workers Comp): if any strapping code is selected, add the
// bonus to the per-day flat rate.
export const FLAT_RATE_PAYERS = {
  'Workers Comp': { perDay: 80, strappingBonus: 25 },
  'Web TPA': { perDay: 55 },
  Attorney: { perDay: 150 },
  'UHC (No Secondary)': { perDay: 100 }, // ASH rate when UHC Commercial has no secondary
  'UMR (No Secondary)': { perDay: 100 }, // UMR follows UHC rules — ASH $100/day
};

// Special-case payers — calc shows $0 and surfaces an explanatory banner.
export const SPECIAL_PAYERS = {
  'UHC (W/ Secondary)': {
    message: 'Bill the secondary insurance — UHC Commercial pays $0 when a secondary is present.',
  },
  'UMR (W/ Secondary)': {
    message: 'Bill the secondary insurance — UMR follows UHC rules and pays $0 when a secondary is present.',
  },
};

// CPT numbers + max billable units per base code. maxUnits > 1 enables the
// stepper; the calculator resolves base code + qty to a rate-table key.
export const CODE_META = {
  // Evaluations
  'EVAL-61': { cpt: '97161', maxUnits: 1, discipline: 'PT' },
  'EVAL-62': { cpt: '97162', maxUnits: 1, discipline: 'PT' },
  'EVAL-63': { cpt: '97163', maxUnits: 1, discipline: 'PT' },
  'RE-EVAL-4': { cpt: '97164', maxUnits: 1, discipline: 'PT' },
  'EVAL-65': { cpt: '97165', maxUnits: 1, discipline: 'OT' },
  'EVAL-66': { cpt: '97166', maxUnits: 1, discipline: 'OT' },
  'EVAL-67': { cpt: '97167', maxUnits: 1, discipline: 'OT' },
  'RE-EVAL-8': { cpt: '97168', maxUnits: 1, discipline: 'OT' },
  // Therapeutic (unit codes)
  TX: { cpt: '97110', maxUnits: 4 },
  NR: { cpt: '97112', maxUnits: 4 },
  MT: { cpt: '97140', maxUnits: 4 },
  TA: { cpt: '97530', maxUnits: 4 },
  GT: { cpt: '97116', maxUnits: 3 },
  GPT: { cpt: '97150', maxUnits: 1 },
  // Modalities
  ESM: { cpt: 'G0283', maxUnits: 1 },
  ES: { cpt: '97014', maxUnits: 1 },
  VASO: { cpt: '97016', maxUnits: 1 },
  US: { cpt: '97035', maxUnits: 1 },
  TRX: { cpt: '97012', maxUnits: 1 },
  PB: { cpt: '97018', maxUnits: 1 },
  IONTO: { cpt: '97033', maxUnits: 2 },
  CR: { cpt: '95992', maxUnits: 1 },
  PPT: { cpt: '97750', maxUnits: 1 },
  SELFCARE: { cpt: '97535', maxUnits: 1 },
  SI: { cpt: '97533', maxUnits: 1 },
  // Aquatic
  AQ: { cpt: '97113', maxUnits: 5 },
  // Strapping
  ST: { cpt: '29200', maxUnits: 1 },
  SSH: { cpt: '29240', maxUnits: 1 },
  SE: { cpt: '29260', maxUnits: 1 },
  SHAND: { cpt: '29280', maxUnits: 1 },
  SHIP: { cpt: '29520', maxUnits: 1 },
  SK: { cpt: '29530', maxUnits: 1 },
  SF: { cpt: '29540', maxUnits: 1 },
  STOE: { cpt: '29550', maxUnits: 1 },
  // Dry needling
  DN1: { cpt: '20560', maxUnits: 1 },
  DN2: { cpt: '20561', maxUnits: 1 },
  // Wound care
  WC: { cpt: '97597', maxUnits: 1 },
  WC2: { cpt: '97598', maxUnits: 1 },
  // Orthotic
  OM: { cpt: '97760', maxUnits: 3 },
};

// Base unit code -> { qty: rate-table key }. Drives the stepper.
export const UNIT_KEY_MAP = {
  TX: { 1: 'TX', 2: '2TX', 3: '3TX', 4: '4TX' },
  NR: { 1: 'NR', 2: '2NR', 3: '3NR', 4: '4NR' },
  MT: { 1: 'MT', 2: '2MT', 3: '3MT', 4: '4MT' },
  TA: { 1: 'TA', 2: '2TA', 3: '3TA', 4: '4TA' },
  GT: { 1: 'GT', 2: '2GT', 3: '3GT' },
  AQ: { 1: 'AQ', 2: 'AQ2', 3: 'AQ3', 4: 'AQ4', 5: 'AQ5' },
  OM: { 1: 'OM', 2: '2OM', 3: '3OM' },
  IONTO: { 1: 'IONTO', 2: '2IONTO' },
};

// Every rate-table key that is a multi-unit variant (2TX, 3NR, AQ2…).
// Used to collapse admin code groups down to base keys for the stepper UI.
const VARIANT_TO_BASE = (() => {
  const map = {};
  Object.entries(UNIT_KEY_MAP).forEach(([base, variants]) => {
    Object.values(variants).forEach((key) => { map[key] = base; });
  });
  return map;
})();

export const STRAPPING_KEYS = ['ST', 'SSH', 'SE', 'SHAND', 'SHIP', 'SK', 'SF', 'STOE'];

// Tier-1 payer rule engine. `test` receives the resolved rate-table keys
// currently selected (e.g. ["MT", "2TA", "EVAL-61"]) and returns true to
// surface the warning. "_global" runs against every payer.
// severity: "error" (hard rule) | "warn" (soft preference, default).
const BCBS_PREFERENCE_RULES = [
  {
    test: (keys) => keys.some((k) => /^[2-4]?MT$/.test(k)) && !keys.some((k) => /^[2-4]?TX$/.test(k)),
    message: 'Pays TX higher than MT — consider swapping MT → TX.',
    severity: 'warn',
  },
  {
    test: (keys) => keys.includes('2NR') && !keys.includes('2TA'),
    message: 'Pays 2TA higher than 2NR — consider swapping 2NR → 2TA.',
    severity: 'warn',
  },
];

export const PAYER_RULES = {
  _global: [
    {
      test: (keys) => keys.some((k) => /^[2-4]?MT$/.test(k)) && keys.includes('97124'),
      message: '97140 (Manual) and 97124 (Massage) cannot be billed together — all payers.',
      severity: 'error',
    },
  ],
  Aetna: [
    {
      test: (keys) => keys.some((k) => /^[2-4]?MT$/.test(k)) && keys.some((k) => /^[2-4]?TA$/.test(k)),
      message: 'TA and MT cannot be billed together.',
      severity: 'error',
    },
    {
      test: (keys) => keys.length > 4,
      message: 'Aetna pays only your 4 lowest-rate covered codes. Drop to 4 or pick your strongest 4.',
      severity: 'warn',
    },
  ],
  'Humana Medicare': [
    {
      test: (keys) => keys.includes('GPT') && keys.some((k) => /^[2-4]?MT$/.test(k)),
      message: 'Group therapy and Manual Therapy cannot be billed together.',
      severity: 'error',
    },
    {
      test: (keys) => keys.some((k) => /^[2-4]/.test(k)),
      message: 'No 97 modifier on multi-unit codes (codes beginning with 2/3/4).',
      severity: 'error',
    },
  ],
  Medicare: [
    {
      test: (keys) =>
        keys.some((k) => /^[2-4]/.test(k)) ||
        keys.some((k) => /^DN/.test(k)) ||
        keys.some((k) => /^S/.test(k) && k !== 'SELFCARE' && k !== 'SI'),
      message: 'No 59 modifier on multi-unit codes, dry needling, or strapping codes.',
      severity: 'error',
    },
    {
      test: (keys) => keys.some((k) => /^[2-4]?TA$/.test(k)) && !keys.some((k) => /^[2-4]?NR$/.test(k)),
      message: 'Medicare prefers NR over TA. Consider swapping TA → NR to reduce denial risk.',
      severity: 'warn',
    },
  ],
  'CIGNA / ASH': [
    {
      test: (keys) =>
        keys.includes('VASO') ||
        keys.some((k) => /^DN/.test(k)) ||
        keys.some((k) => /^S/.test(k) && k !== 'SELFCARE' && k !== 'SI'),
      message: 'Cigna does not reimburse for 97016-Vaso, dry needling, or strapping codes.',
      severity: 'error',
    },
  ],
  'BCBS Commercial': BCBS_PREFERENCE_RULES,
  'BCBS Medicare': BCBS_PREFERENCE_RULES,
  BlueCare: BCBS_PREFERENCE_RULES,
};

export const fmtUSD = (n) => `$${(n || 0).toFixed(2)}`;

// Is this payer one of the app-level flat-rate payers?
export const isFlatRatePayer = (payer) =>
  Object.prototype.hasOwnProperty.call(FLAT_RATE_PAYERS, payer);

// Is this payer one of the app-level special-case ($0 / bill-secondary) payers?
export const isSpecialPayer = (payer) =>
  Object.prototype.hasOwnProperty.call(SPECIAL_PAYERS, payer);

// Resolve a base display key + quantity to its rate-table key (TX,2 -> "2TX").
export const resolveKey = (displayKey, qty) => UNIT_KEY_MAP[displayKey]?.[qty] ?? displayKey;

// Map any rate-table key back to its base stepper key ("2TX" -> "TX").
export const baseKeyOf = (key) => VARIANT_TO_BASE[key] || key;

// Effective max units for a base code given which variants admin rates expose.
// Caps the stepper so we never offer a quantity the rate table can't price.
export function effectiveMaxUnits(displayKey, RATES) {
  const meta = CODE_META[displayKey];
  const ceiling = meta?.maxUnits || 1;
  const variants = UNIT_KEY_MAP[displayKey];
  if (!variants) return 1;
  let max = 1;
  for (let q = 1; q <= ceiling; q++) {
    const key = variants[q];
    if (key && RATES[key]) max = q;
  }
  return max;
}

// Per-line rate for (displayKey, qty, payer) using admin-managed RATES.
// Flat-rate / special payers suppress the per-code rate (covered=true so the
// code stays selectable); the total comes from getPayerOverride.
export function getLineRate(displayKey, qty, payer, RATES) {
  const resolvedKey = resolveKey(displayKey, qty);
  if (!payer) return { rate: 0, resolvedKey, covered: false, billingMode: 'none' };
  if (isFlatRatePayer(payer)) return { rate: 0, resolvedKey, covered: true, billingMode: 'flat' };
  if (isSpecialPayer(payer)) return { rate: 0, resolvedKey, covered: true, billingMode: 'special' };

  const rate = (RATES[resolvedKey] || {})[payer] ?? 0;
  return { rate, resolvedKey, covered: rate > 0, billingMode: 'perCode' };
}

// Override total for flat-rate / special payers; null for per-code payers.
// resolvedKeys: resolved rate-table keys currently selected.
export function getPayerOverride(payer, resolvedKeys) {
  if (!payer) return null;

  if (isFlatRatePayer(payer)) {
    const cfg = FLAT_RATE_PAYERS[payer];
    let total = cfg.perDay;
    let label = `Flat ${fmtUSD(cfg.perDay)}/day`;
    if (cfg.strappingBonus && resolvedKeys.some((k) => STRAPPING_KEYS.includes(k))) {
      total += cfg.strappingBonus;
      label += ` + ${fmtUSD(cfg.strappingBonus)} strapping`;
    }
    return { total, label, banner: null };
  }

  if (isSpecialPayer(payer)) {
    return { total: 0, label: 'Bill secondary', banner: SPECIAL_PAYERS[payer].message };
  }

  return null;
}

// Evaluate Tier-1 rule engine for a payer against resolved keys.
// Returns [{ message, severity }].
export function getRuleWarnings(payer, resolvedKeys) {
  if (!payer) return [];
  const rules = [...(PAYER_RULES._global || []), ...(PAYER_RULES[payer] || [])];
  return rules
    .filter((r) => r.test(resolvedKeys))
    .map((r) => ({ message: r.message, severity: r.severity || 'warn' }));
}

// Split a rate-table key into its base stepper key + quantity.
// "2TX" -> { base: "TX", qty: 2 };  "MT" -> { base: "MT", qty: 1 }.
export function splitResolved(key) {
  const base = baseKeyOf(key);
  if (base === key) return { base, qty: 1 };
  const variants = UNIT_KEY_MAP[base] || {};
  const qty = Number(Object.keys(variants).find((q) => variants[q] === key)) || 1;
  return { base, qty };
}

// Build the { displayKey: qty } selection map from a flat list of resolved
// rate-table keys (templates, saved combos, favorites). Highest qty wins if a
// base appears more than once.
export function selectedFromResolvedKeys(keys) {
  const sel = {};
  (keys || []).forEach((k) => {
    const { base, qty } = splitResolved(k);
    sel[base] = Math.max(sel[base] || 0, qty);
  });
  return sel;
}

// Collapse a list of rate-table keys (admin code group) to ordered base keys
// for the stepper UI — "TX","2TX","3TX" all fold into a single "TX" chip.
export function toBaseKeys(keys) {
  const seen = new Set();
  const out = [];
  (keys || []).forEach((k) => {
    const base = baseKeyOf(k);
    if (!seen.has(base)) {
      seen.add(base);
      out.push(base);
    }
  });
  return out;
}
