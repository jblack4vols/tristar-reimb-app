/**
 * Smart Billing Optimizer
 *
 * Defines relationships between CPT codes and suggests higher-paying
 * alternatives when available for the selected payer.
 */

// Code upgrade paths: each entry maps a code to potential upgrades
// "same_family" means they're the same service at different unit counts
// "alternative" means they're different codes for similar services
const CODE_RELATIONSHIPS = {
  // Therapeutic Exercise — more units = more pay
  'TX':  { upgrades: ['2TX', '3TX', '4TX'], type: 'units', label: 'Therapeutic Exercise' },
  '2TX': { upgrades: ['3TX', '4TX'], type: 'units', label: 'Therapeutic Exercise' },
  '3TX': { upgrades: ['4TX'], type: 'units', label: 'Therapeutic Exercise' },

  // Neuromuscular Re-ed
  'NR':  { upgrades: ['2NR', '3NR', '4NR'], type: 'units', label: 'Neuromuscular Re-ed' },
  '2NR': { upgrades: ['3NR', '4NR'], type: 'units', label: 'Neuromuscular Re-ed' },
  '3NR': { upgrades: ['4NR'], type: 'units', label: 'Neuromuscular Re-ed' },

  // Manual Therapy
  'MT':  { upgrades: ['2MT', '3MT', '4MT'], type: 'units', label: 'Manual Therapy' },
  '2MT': { upgrades: ['3MT', '4MT'], type: 'units', label: 'Manual Therapy' },
  '3MT': { upgrades: ['4MT'], type: 'units', label: 'Manual Therapy' },

  // Therapeutic Activity
  'TA':  { upgrades: ['2TA', '3TA', '4TA'], type: 'units', label: 'Therapeutic Activity' },
  '2TA': { upgrades: ['3TA', '4TA'], type: 'units', label: 'Therapeutic Activity' },
  '3TA': { upgrades: ['4TA'], type: 'units', label: 'Therapeutic Activity' },

  // Gait Training
  'GT':  { upgrades: ['2GT', '3GT'], type: 'units', label: 'Gait Training' },
  '2GT': { upgrades: ['3GT'], type: 'units', label: 'Gait Training' },

  // Aquatic Therapy
  'AQ':  { upgrades: ['AQ2', 'AQ3', 'AQ4', 'AQ5'], type: 'units', label: 'Aquatic Therapy' },
  'AQ2': { upgrades: ['AQ3', 'AQ4', 'AQ5'], type: 'units', label: 'Aquatic Therapy' },
  'AQ3': { upgrades: ['AQ4', 'AQ5'], type: 'units', label: 'Aquatic Therapy' },
  'AQ4': { upgrades: ['AQ5'], type: 'units', label: 'Aquatic Therapy' },

  // Orthotic Management
  'OM':  { upgrades: ['2OM', '3OM'], type: 'units', label: 'Orthotic Management' },
  '2OM': { upgrades: ['3OM'], type: 'units', label: 'Orthotic Management' },

  // E-Stim: ES (97014) vs ESM (G0283) — Medicare should use ESM
  'ES':  { alternatives: ['ESM'], type: 'alternative', label: 'E-Stim', hint: 'Use G0283 (ESM) for Medicare and Medicare Advantage plans' },
  'ESM': { alternatives: ['ES'], type: 'alternative', label: 'E-Stim', hint: 'Use 97014 (ES) for commercial plans that cover it' },

  // Evals: suggest higher complexity if justified
  'EVAL-61': { upgrades: ['EVAL-62', 'EVAL-63'], type: 'complexity', label: 'PT Eval' },
  'EVAL-62': { upgrades: ['EVAL-63'], type: 'complexity', label: 'PT Eval' },
  'EVAL-65': { upgrades: ['EVAL-66', 'EVAL-67'], type: 'complexity', label: 'OT Eval' },
  'EVAL-66': { upgrades: ['EVAL-67'], type: 'complexity', label: 'OT Eval' },

  // Dry Needling
  'DN1': { upgrades: ['DN2'], type: 'units', label: 'Dry Needling', hint: 'Bill DN2 if 3+ muscles were treated' },

  // Wound Care
  'WC':  { upgrades: ['WC2'], type: 'addon', label: 'Wound Care', hint: 'Add WC2 as an add-on code for additional wound areas' },
};

/**
 * Analyze selected codes and return optimization suggestions
 * @param {string[]} selectedCodes - Currently selected codes
 * @param {string} payer - Selected payer name
 * @param {object} rates - Rates object { code: { payer: amount } }
 * @returns {Array<{ code, suggestion, currentRate, suggestedRate, difference, type, hint }>}
 */
export function getOptimizationSuggestions(selectedCodes, payer, rates) {
  if (!payer || !rates || selectedCodes.length === 0) return [];

  const suggestions = [];

  for (const code of selectedCodes) {
    const rel = CODE_RELATIONSHIPS[code];
    if (!rel) continue;

    const currentRate = (rates[code] || {})[payer] || 0;

    // Check upgrades (higher unit counts)
    if (rel.upgrades) {
      for (const upgrade of rel.upgrades) {
        // Skip if the upgrade is already selected
        if (selectedCodes.includes(upgrade)) continue;

        const upgradeRate = (rates[upgrade] || {})[payer] || 0;
        if (upgradeRate > currentRate && upgradeRate > 0) {
          const diff = upgradeRate - currentRate;
          suggestions.push({
            code,
            suggestion: upgrade,
            currentRate,
            suggestedRate: upgradeRate,
            difference: diff,
            type: rel.type,
            label: rel.label,
            hint: rel.type === 'units'
              ? `Billing ${upgrade} instead of ${code} would pay $${diff.toFixed(2)} more for ${payer}. Consider if treatment time supports additional units.`
              : rel.type === 'complexity'
              ? `A higher complexity eval (${upgrade}) pays $${diff.toFixed(2)} more. Use if documentation supports the higher level.`
              : rel.hint || `${upgrade} pays $${diff.toFixed(2)} more than ${code}.`,
          });
          break; // Only suggest the next upgrade, not all of them
        }
      }
    }

    // Check alternatives (different codes for similar services)
    if (rel.alternatives) {
      for (const alt of rel.alternatives) {
        if (selectedCodes.includes(alt)) continue;

        const altRate = (rates[alt] || {})[payer] || 0;
        if (altRate > currentRate && currentRate >= 0) {
          suggestions.push({
            code,
            suggestion: alt,
            currentRate,
            suggestedRate: altRate,
            difference: altRate - currentRate,
            type: 'alternative',
            label: rel.label,
            hint: rel.hint || `${alt} pays more than ${code} for this payer.`,
          });
        }
      }
    }
  }

  // Deduplicate — only one suggestion per code
  const seen = new Set();
  return suggestions.filter(s => {
    if (seen.has(s.code)) return false;
    seen.add(s.code);
    return true;
  });
}

/**
 * Check for common billing mistakes
 * @param {string[]} selectedCodes
 * @param {string} payer
 * @param {object} rates
 * @returns {Array<{ type: 'warning'|'error', message }>}
 */
export function getBillingWarnings(selectedCodes, payer, rates) {
  const warnings = [];

  if (!payer || !selectedCodes || !rates || selectedCodes.length === 0) return warnings;

  // Check for codes with $0 rate (not covered)
  const zeroCodes = selectedCodes.filter(c => ((rates[c] || {})[payer] || 0) === 0);
  if (zeroCodes.length > 0) {
    warnings.push({
      type: 'error',
      message: `${zeroCodes.join(', ')} — not covered by ${payer}. These will not be reimbursed.`,
    });
  }

  // Check for ES on Medicare (should use ESM)
  if (selectedCodes.includes('ES') && (payer.includes('Medicare') || payer === 'Humana Medicare' || payer === 'Amerivantage')) {
    warnings.push({
      type: 'warning',
      message: `You selected ES (97014) but ${payer} requires G0283 (ESM) for E-Stim. Switch to ESM.`,
    });
  }

  // Check for TA + MT on Aetna
  if (selectedCodes.some(c => c.includes('TA')) && selectedCodes.some(c => c.includes('MT')) && payer === 'Aetna') {
    warnings.push({
      type: 'error',
      message: 'Aetna does not allow Therapeutic Activity (TA) and Manual Therapy (MT) on the same claim.',
    });
  }

  // Check for duplicate service families (e.g., TX and 2TX selected)
  const families = {};
  for (const code of selectedCodes) {
    const rel = CODE_RELATIONSHIPS[code];
    if (rel && rel.type === 'units') {
      const family = rel.label;
      if (!families[family]) families[family] = [];
      families[family].push(code);
    }
  }
  for (const [family, codes] of Object.entries(families)) {
    if (codes.length > 1) {
      warnings.push({
        type: 'warning',
        message: `You have multiple ${family} codes selected (${codes.join(', ')}). Typically only one unit level should be billed per visit.`,
      });
    }
  }

  return warnings;
}
