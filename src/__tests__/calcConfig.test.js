import {
  resolveKey, splitResolved, selectedFromResolvedKeys, toBaseKeys,
  getLineRate, getPayerOverride, getRuleWarnings, effectiveMaxUnits,
} from '../utils/calcConfig';

describe('calcConfig — unit key resolution', () => {
  it('resolves base code + qty to rate-table key', () => {
    expect(resolveKey('TX', 2)).toBe('2TX');
    expect(resolveKey('AQ', 3)).toBe('AQ3');
    expect(resolveKey('MT', 1)).toBe('MT');
    expect(resolveKey('DN1', 1)).toBe('DN1'); // no variants
  });

  it('splits a resolved key into base + qty', () => {
    expect(splitResolved('2TX')).toEqual({ base: 'TX', qty: 2 });
    expect(splitResolved('AQ3')).toEqual({ base: 'AQ', qty: 3 });
    expect(splitResolved('MT')).toEqual({ base: 'MT', qty: 1 });
  });

  it('builds a selection map from resolved keys (highest qty wins)', () => {
    expect(selectedFromResolvedKeys(['2TX', 'MT', 'TX'])).toEqual({ TX: 2, MT: 1 });
  });

  it('collapses variants to ordered base keys', () => {
    expect(toBaseKeys(['TX', '2TX', '3TX', 'MT', '2MT'])).toEqual(['TX', 'MT']);
  });
});

describe('calcConfig — getLineRate', () => {
  const RATES = { TX: { Medicare: 30 }, '2TX': { Medicare: 60 } };

  it('prices a covered per-code line from admin rates', () => {
    const r = getLineRate('TX', 1, 'Medicare', RATES);
    expect(r).toMatchObject({ rate: 30, resolvedKey: 'TX', covered: true, billingMode: 'perCode' });
  });

  it('resolves multi-unit lines before pricing', () => {
    expect(getLineRate('TX', 2, 'Medicare', RATES).rate).toBe(60);
  });

  it('marks zero/absent rates as not covered', () => {
    expect(getLineRate('TX', 1, 'Aetna', RATES).covered).toBe(false);
  });

  it('suppresses per-code rate for flat-rate payers', () => {
    const r = getLineRate('TX', 1, 'Workers Comp', RATES);
    expect(r).toMatchObject({ billingMode: 'flat', covered: true, rate: 0 });
  });

  it('flags special payers', () => {
    expect(getLineRate('TX', 1, 'UHC (W/ Secondary)', RATES).billingMode).toBe('special');
  });
});

describe('calcConfig — getPayerOverride', () => {
  it('returns null for ordinary per-code payers', () => {
    expect(getPayerOverride('Medicare', ['TX'])).toBeNull();
  });

  it('returns the flat per-day total', () => {
    expect(getPayerOverride('Web TPA', ['TX']).total).toBe(55);
  });

  it('adds the Workers Comp strapping bonus only when a strapping code is present', () => {
    expect(getPayerOverride('Workers Comp', ['TX']).total).toBe(80);
    expect(getPayerOverride('Workers Comp', ['ST']).total).toBe(105);
  });

  it('returns $0 + banner for special payers', () => {
    const o = getPayerOverride('UMR (W/ Secondary)', []);
    expect(o.total).toBe(0);
    expect(o.banner).toBeTruthy();
  });
});

describe('calcConfig — getRuleWarnings', () => {
  it('flags Medicare 59-modifier on multi-unit codes as an error', () => {
    const w = getRuleWarnings('Medicare', ['2TX']);
    expect(w.some(x => x.severity === 'error')).toBe(true);
  });

  it('flags suffix-named multi-unit variants (AQ2) too, not just prefixed ones', () => {
    expect(getRuleWarnings('Medicare', ['AQ2']).some(x => x.severity === 'error')).toBe(true);
    expect(getRuleWarnings('Humana Medicare', ['AQ3']).some(x => x.severity === 'error')).toBe(true);
  });

  it('warns when Aetna has more than 4 codes', () => {
    const w = getRuleWarnings('Aetna', ['TX', 'NR', 'MT', 'TA', 'GT']);
    expect(w.some(x => /4 lowest-rate/.test(x.message))).toBe(true);
  });

  it('returns nothing for a clean Medicare claim', () => {
    expect(getRuleWarnings('Medicare', ['TX', 'NR'])).toEqual([]);
  });
});

describe('calcConfig — effectiveMaxUnits', () => {
  it('caps the stepper to the variants admin rates expose', () => {
    expect(effectiveMaxUnits('TX', { TX: {}, '2TX': {} })).toBe(2);
    expect(effectiveMaxUnits('TX', { TX: {}, '2TX': {}, '3TX': {}, '4TX': {} })).toBe(4);
  });

  it('returns 1 for single-unit codes', () => {
    expect(effectiveMaxUnits('US', { US: {} })).toBe(1);
  });
});
