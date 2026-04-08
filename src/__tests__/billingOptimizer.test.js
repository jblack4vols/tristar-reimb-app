import { getOptimizationSuggestions, getBillingWarnings } from '../utils/billingOptimizer';

// ── Mock rates ──────────────────────────────────────────
const RATES = {
  TX:  { Medicare: 30, Aetna: 26 },
  '2TX': { Medicare: 60, Aetna: 52 },
  '3TX': { Medicare: 90, Aetna: 78 },
  '4TX': { Medicare: 120, Aetna: 104 },
  NR:  { Medicare: 28, Aetna: 24 },
  '2NR': { Medicare: 56, Aetna: 48 },
  MT:  { Medicare: 32, Aetna: 28 },
  '2MT': { Medicare: 64, Aetna: 56 },
  TA:  { Medicare: 30, Aetna: 26 },
  '2TA': { Medicare: 60, Aetna: 52 },
  ES:  { Medicare: 0, Aetna: 15 },
  ESM: { Medicare: 20, Aetna: 18 },
  GT:  { Medicare: 25, Aetna: 22 },
  'EVAL-61': { Medicare: 80, Aetna: 75 },
  'EVAL-62': { Medicare: 120, Aetna: 110 },
  'EVAL-63': { Medicare: 160, Aetna: 145 },
  DN1: { Medicare: 40, Aetna: 35 },
  DN2: { Medicare: 55, Aetna: 50 },
};

// ── getOptimizationSuggestions ───────────────────────────

describe('getOptimizationSuggestions', () => {
  it('returns empty when no codes selected', () => {
    expect(getOptimizationSuggestions([], 'Medicare', RATES)).toEqual([]);
  });

  it('returns empty when no payer selected', () => {
    expect(getOptimizationSuggestions(['TX'], '', RATES)).toEqual([]);
  });

  it('suggests upgrading TX to 2TX when rate is higher', () => {
    const result = getOptimizationSuggestions(['TX'], 'Medicare', RATES);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('TX');
    expect(result[0].suggestion).toBe('2TX');
    expect(result[0].difference).toBe(30); // 60 - 30
  });

  it('suggests upgrading eval complexity', () => {
    const result = getOptimizationSuggestions(['EVAL-61'], 'Medicare', RATES);
    expect(result).toHaveLength(1);
    expect(result[0].suggestion).toBe('EVAL-62');
    expect(result[0].difference).toBe(40); // 120 - 80
  });

  it('does not suggest upgrade already in codes', () => {
    const result = getOptimizationSuggestions(['TX', '2TX'], 'Medicare', RATES);
    // TX upgrade to 2TX should be skipped since 2TX is already selected
    // TX should suggest 3TX instead (next available)
    const txSuggestion = result.find(s => s.code === 'TX');
    if (txSuggestion) {
      expect(txSuggestion.suggestion).toBe('3TX');
    }
  });

  it('suggests ESM over ES for Medicare', () => {
    const result = getOptimizationSuggestions(['ES'], 'Medicare', RATES);
    const esSuggestion = result.find(s => s.code === 'ES');
    expect(esSuggestion).toBeDefined();
    expect(esSuggestion.suggestion).toBe('ESM');
  });

  it('does not suggest downgrade', () => {
    // 2TX already selected, should not suggest going back to TX
    const result = getOptimizationSuggestions(['2TX'], 'Medicare', RATES);
    const downgrade = result.find(s => s.suggestion === 'TX');
    expect(downgrade).toBeUndefined();
  });

  it('deduplicates suggestions per code', () => {
    const result = getOptimizationSuggestions(['TX'], 'Medicare', RATES);
    const txSuggestions = result.filter(s => s.code === 'TX');
    expect(txSuggestions).toHaveLength(1);
  });
});

// ── getBillingWarnings ──────────────────────────────────

describe('getBillingWarnings', () => {
  it('returns empty when no codes or payer', () => {
    expect(getBillingWarnings([], 'Medicare', RATES)).toEqual([]);
    expect(getBillingWarnings(['TX'], '', RATES)).toEqual([]);
  });

  it('warns about $0 rate codes (not covered)', () => {
    const result = getBillingWarnings(['ES'], 'Medicare', RATES);
    const zeroWarning = result.find(w => w.type === 'error');
    expect(zeroWarning).toBeDefined();
    expect(zeroWarning.message).toContain('ES');
    expect(zeroWarning.message).toContain('not covered');
  });

  it('warns about ES on Medicare (should use ESM)', () => {
    const result = getBillingWarnings(['ES'], 'Medicare', RATES);
    const esWarning = result.find(w => w.message.includes('G0283'));
    expect(esWarning).toBeDefined();
  });

  it('warns about TA + MT on Aetna', () => {
    const result = getBillingWarnings(['TA', 'MT'], 'Aetna', RATES);
    const aetnaWarning = result.find(w => w.message.includes('Aetna'));
    expect(aetnaWarning).toBeDefined();
    expect(aetnaWarning.type).toBe('error');
  });

  it('does not warn about TA + MT on non-Aetna payer', () => {
    const result = getBillingWarnings(['TA', 'MT'], 'Medicare', RATES);
    const aetnaWarning = result.find(w => w.message.includes('Aetna'));
    expect(aetnaWarning).toBeUndefined();
  });

  it('warns about duplicate service families', () => {
    const result = getBillingWarnings(['TX', '2TX'], 'Medicare', RATES);
    const dupeWarning = result.find(w => w.message.includes('multiple'));
    expect(dupeWarning).toBeDefined();
    expect(dupeWarning.message).toContain('Therapeutic Exercise');
  });

  it('does not warn about single code per family', () => {
    const result = getBillingWarnings(['TX', 'MT'], 'Medicare', RATES);
    const dupeWarning = result.find(w => w.message.includes('multiple'));
    expect(dupeWarning).toBeUndefined();
  });

  it('detects multi-unit TA codes triggering Aetna rule', () => {
    // 2TA contains 'TA', 2MT contains 'MT'
    const result = getBillingWarnings(['2TA', '2MT'], 'Aetna', RATES);
    const aetnaWarning = result.find(w => w.message.includes('Aetna'));
    expect(aetnaWarning).toBeDefined();
  });
});

// ── Rate calculation sanity checks ──────────────────────

describe('rate calculation sanity', () => {
  it('multi-unit codes should be proportionally higher', () => {
    expect(RATES['2TX'].Medicare).toBeGreaterThan(RATES.TX.Medicare);
    expect(RATES['3TX'].Medicare).toBeGreaterThan(RATES['2TX'].Medicare);
    expect(RATES['4TX'].Medicare).toBeGreaterThan(RATES['3TX'].Medicare);
  });

  it('higher complexity evals pay more', () => {
    expect(RATES['EVAL-62'].Medicare).toBeGreaterThan(RATES['EVAL-61'].Medicare);
    expect(RATES['EVAL-63'].Medicare).toBeGreaterThan(RATES['EVAL-62'].Medicare);
  });

  it('total reimbursement calculation works correctly', () => {
    const codes = ['TX', 'MT', 'ESM'];
    const payer = 'Medicare';
    const total = codes.reduce((sum, c) => sum + ((RATES[c] || {})[payer] || 0), 0);
    expect(total).toBe(30 + 32 + 20); // 82
  });

  it('handles missing code gracefully', () => {
    const codes = ['TX', 'NONEXISTENT'];
    const payer = 'Medicare';
    const total = codes.reduce((sum, c) => sum + ((RATES[c] || {})[payer] || 0), 0);
    expect(total).toBe(30); // only TX
  });

  it('handles missing payer gracefully', () => {
    const codes = ['TX', 'MT'];
    const payer = 'UnknownPayer';
    const total = codes.reduce((sum, c) => sum + ((RATES[c] || {})[payer] || 0), 0);
    expect(total).toBe(0);
  });
});
