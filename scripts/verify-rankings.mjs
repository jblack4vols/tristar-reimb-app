#!/usr/bin/env node
/* global console, process */
/**
 * verify-rankings.mjs — prints the combo ranker's per-payer value tiers and a
 * "4 TA" loss table, then runs regression assertions.
 *
 * Run: node scripts/verify-rankings.mjs
 *
 * The ranking reflects how codes are PAID (estimated value), not a directive on
 * what to bill. Where the real rates.js data diverges from a spec assumption,
 * this script FLAGS it (⚠️) rather than silently shipping — see GUARDRAILS in the
 * task. Exits non-zero only if a hard regression assertion fails.
 */
import { RATES, PAYERS } from '../src/data/rates.js';
import { rankTiers, allTAValue, priceUnits } from '../src/utils/comboRanker.js';

const usd = (n) => (n === null || n === undefined ? '   n/a ' : `$${n.toFixed(2)}`.padStart(8));
const hr = (c = '─') => console.log(c.repeat(72));

const flags = [];   // soft data-vs-spec notes
const failures = []; // hard assertion failures

// ── 1. Per-payer top value tiers ────────────────────────────────────────────
console.log('\nESTIMATED-VALUE TIERS (4 timed units, PTA/OTA 0.85, rules applied)');
console.log('Value = how the combo is PAID, not a directive to bill it.\n');
for (const payer of PAYERS) {
  const tiers = rankTiers(payer);
  console.log(`\x1b[1m${payer}\x1b[0m`);
  if (tiers.length === 0) { console.log('  (no billable timed combo)\n'); continue; }
  tiers.slice(0, 4).forEach((t, i) => {
    console.log(`  ${i + 1}. ${usd(t.value)}  ${t.combos.join('  |  ')}`);
  });
  console.log('');
}

// ── 2. "4 TA" loss table ────────────────────────────────────────────────────
hr('═');
console.log('LOSS FROM BILLING "4 TA" INSTEAD OF THE BEST COMBO');
hr();
console.log(`${'Payer'.padEnd(24)} ${'best $'.padStart(8)} ${'4 TA $'.padStart(8)} ${'loss'.padStart(8)}   flag`);
hr();
for (const payer of PAYERS) {
  const best = rankTiers(payer)[0]?.value ?? null;
  const fourTA = allTAValue(payer);
  const loss = best !== null && fourTA !== null ? Math.round((best - fourTA) * 100) / 100 : null;
  const flag = loss !== null && loss >= 5 ? '⚠️  ≥ $5 lost' : '';
  console.log(`${payer.padEnd(24)} ${usd(best)} ${usd(fourTA)} ${usd(loss)}   ${flag}`);
}
hr();

// ── 3. Regression assertions (hard) + spec-vs-data checks (soft) ─────────────
console.log('\nASSERTIONS');

// (a) HARD: 97530 (TA) bundles DOWN — 4 units < 4 x single — for Medicare AND Aetna.
for (const payer of ['Medicare', 'Aetna']) {
  const bundled = priceUnits('TA', 4, payer);
  const additive = (RATES.TA[payer] || 0) * 4;
  const ok = bundled > 0 && bundled < additive;
  console.log(`  ${ok ? '✓' : '✗'} ${payer}: 4 TA bundled ($${bundled.toFixed(2)}) < additive ($${additive.toFixed(2)})`);
  if (!ok) failures.push(`${payer}: expected 4 TA to bundle down (bundled ${bundled} < additive ${additive})`);
}

// (b) HARD: "4 TA" is NOT the optimal combo for Aetna (the old template bug).
const aetnaTop = rankTiers('Aetna')[0];
const aetnaTopHas4TA = aetnaTop.combos.includes('4 TA');
console.log(`  ${!aetnaTopHas4TA ? '✓' : '✗'} Aetna #1 is not "4 TA" — actual: ${aetnaTop.combos.join(' | ')} (${usd(aetnaTop.value).trim()})`);
if (aetnaTopHas4TA) failures.push('Aetna ranked "4 TA" first (template-fill regression)');

// (c) SOFT: spec predicted Aetna #1 ≈ "3 NR + 1 TA"-class (one TA). Flag if the
//     real-data optimum differs — don't force a false assertion.
const aetnaTopOneTA = aetnaTop.combos.every((c) => /(^|\+ )1 TA( |$)/.test(` ${c} `) || !c.includes('TA'));
if (!aetnaTopOneTA || !aetnaTop.combos.some((c) => c.includes('NR') && c.includes('TA'))) {
  flags.push(`Aetna real-data optimum is "${aetnaTop.combos.join(' | ')}", not the spec-predicted "3 NR + 1 TA" class. Ranker uses rates.js as the source of truth.`);
}

// (d) SOFT: spec said 97110 (TX) "stays linear" => 4 TX == 4 x single TX. The
//     Medicare data has 4TX bundling UP, so flag the divergence (no rate edit).
{
  const bundled = priceUnits('TX', 4, 'Medicare');
  const additive = RATES.TX.Medicare * 4;
  if (Math.abs(bundled - additive) > 0.01) {
    flags.push(`Medicare 4 TX is NOT exactly additive: bundled $${bundled.toFixed(2)} vs 4×single $${additive.toFixed(2)} (bundles ${bundled > additive ? 'UP' : 'DOWN'} by $${Math.abs(bundled - additive).toFixed(2)}). Ranker honors the bundled key per spec; flagging since spec assumed TX is linear.`);
  }
}

// (e) SOFT: data-sanity — TA unit totals should be monotonic in n. A drop would
//     suggest a data-entry error rather than real bundling. Flag, don't ship blind.
for (const payer of PAYERS) {
  const seq = [1, 2, 3, 4].map((n) => priceUnits('TA', n, payer)).filter((v) => v > 0);
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] < seq[i - 1]) {
      flags.push(`Possible rates.js data issue: ${payer} TA totals non-monotonic across units (${seq.join(' → ')}). Review before trusting this payer's TA ranking.`);
      break;
    }
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────
if (flags.length) {
  console.log('\n⚠️  DATA-vs-SPEC FLAGS (review, not auto-shipped):');
  flags.forEach((f) => console.log(`   • ${f}`));
}
console.log('');
if (failures.length) {
  console.log(`\x1b[31m✗ ${failures.length} hard assertion(s) FAILED:\x1b[0m`);
  failures.forEach((f) => console.log(`   • ${f}`));
  process.exit(1);
}
console.log('\x1b[32m✓ All hard assertions passed.\x1b[0m');
