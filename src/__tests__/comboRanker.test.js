import { describe, it, expect } from 'vitest';
import {
  enumerateCombos, priceUnits, comboValue, comboLabel, rankTiers, violatesRules,
  PTA_OTA_DIFFERENTIAL,
} from '../utils/comboRanker.js';
import { RATES } from '../data/rates.js';

describe('enumerateCombos', () => {
  it('produces the full multiset of 4 units over 4 codes (C(7,4) = 35), each once', () => {
    const combos = enumerateCombos(4);
    expect(combos.length).toBe(35);
    const keys = combos.map((c) => comboLabel(c));
    expect(new Set(keys).size).toBe(35);          // no duplicates
    expect(keys).toContain('4 TA');
    expect(keys).toContain('2 TX + 2 TA');
    expect(keys).toContain('1 TX + 1 NR + 1 MT + 1 TA');
  });
});

describe('priceUnits — bundled key is the source of truth', () => {
  it('uses the bundled key when present (non-additive)', () => {
    // Medicare 4TA bundles DOWN: 102.50 (bundled) vs 4 x 31.86 = 127.44 (additive)
    expect(priceUnits('TA', 4, 'Medicare')).toBe(102.5);
    expect(priceUnits('TA', 4, 'Medicare')).toBeLessThan(4 * RATES.TA.Medicare);
  });
  it('falls back to single x n only when no bundled key exists', () => {
    const fake = { XX: { P: 10 } }; // no "3XX" key
    expect(priceUnits('XX', 3, 'P', fake)).toBe(30);
  });
  it('returns 0 for an uncovered unit-count', () => {
    expect(priceUnits('NR', 4, 'Aetna')).toBe(0); // Aetna 4NR = 0
  });
});

describe('comboValue', () => {
  it('applies the PTA/OTA differential to the bundled total', () => {
    // 2 TX + 2 TA, Medicare: 41.25 + 48.32 = 89.57, x0.85 = 76.13 (rounded)
    const v = comboValue({ TX: 2, TA: 2 }, 'Medicare');
    expect(v).toBe(Math.round((RATES['2TX'].Medicare + RATES['2TA'].Medicare) * PTA_OTA_DIFFERENTIAL * 100) / 100);
  });
  it('returns null for an uncovered component', () => {
    expect(comboValue({ NR: 4 }, 'Aetna')).toBeNull(); // 4NR uncovered
  });
  it('skips Aetna TA + MT (rule violation)', () => {
    expect(violatesRules({ TA: 2, MT: 2 }, 'Aetna')).toBe(true);
    expect(comboValue({ TA: 2, MT: 2 }, 'Aetna')).toBeNull();
    // same shape is fine for a payer without that rule
    expect(comboValue({ TA: 2, MT: 2 }, 'Medicare')).not.toBeNull();
  });
});

describe('rankTiers', () => {
  it('groups exact-value ties into one tier and sorts descending', () => {
    const tiers = rankTiers('Medicare');
    // strictly descending tier values => every equal-value combo was merged
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i - 1].value).toBeGreaterThan(tiers[i].value);
    }
    // grouping is deterministic on a constructed tie: 2 units priced two ways
    const fake = { A: { P: 5 }, '2A': { P: 10 }, B: { P: 5 }, '2B': { P: 10 } };
    const t = rankTiers('P', fake, { units: 2, codes: ['A', 'B'] });
    // "2 A", "2 B", and "1 A + 1 B" all price to 10 (x0.85) -> one tier, 3 combos
    expect(t.length).toBe(1);
    expect(t[0].combos.length).toBe(3);
  });
  it('does not rank "4 TA" first for Aetna (the old template bug)', () => {
    const top = rankTiers('Aetna')[0];
    expect(top.combos).not.toContain('4 TA');
  });
});
