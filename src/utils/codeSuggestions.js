/**
 * Auto-suggest missing codes based on common billing patterns.
 *
 * Uses two sources:
 * 1. Static rules — known clinical patterns (e.g., therapeutic codes usually include modalities)
 * 2. Historical data — what codes appear together most often in past billing_entries
 *
 * Returns suggestions only for codes NOT already selected.
 */

// Static co-occurrence rules based on PT/OT billing best practices
const STATIC_RULES = [
  {
    // If any therapeutic code is selected, suggest ESM and VASO
    trigger: (codes) => codes.some(c => ['TX', '2TX', '3TX', '4TX', 'NR', '2NR', '3NR', '4NR', 'MT', '2MT', '3MT', '4MT', 'TA', '2TA', '3TA', '4TA', 'GT', '2GT', '3GT'].includes(c)),
    suggest: ['ESM', 'VASO'],
    reason: 'Most visits with therapeutic codes also bill electrical stimulation and vasopneumatic.',
    revenueHint: 'Adds ~$35-55 per visit depending on payer.',
  },
  {
    // If eval is selected but no therapeutic codes, suggest TX
    trigger: (codes) => codes.some(c => c.startsWith('EVAL-') || c.startsWith('RE-EVAL')) && !codes.some(c => ['TX', '2TX', 'NR', 'MT', 'TA', 'GT'].includes(c)),
    suggest: ['TX', 'NR'],
    reason: 'Evaluations typically include at least one therapeutic treatment code.',
    revenueHint: 'TX + NR adds ~$55-65 per visit.',
  },
  {
    // If manual therapy is selected, suggest therapeutic exercise
    trigger: (codes) => codes.some(c => ['MT', '2MT', '3MT', '4MT'].includes(c)) && !codes.some(c => ['TX', '2TX', '3TX', '4TX'].includes(c)),
    suggest: ['TX'],
    reason: 'Manual therapy visits almost always include therapeutic exercise.',
    revenueHint: 'Adds ~$25-48 depending on payer.',
  },
  {
    // Dry needling often paired with ESM
    trigger: (codes) => codes.some(c => ['DN1', 'DN2'].includes(c)) && !codes.some(c => ['ESM', 'ES'].includes(c)),
    suggest: ['ESM'],
    reason: 'Dry needling is commonly followed by electrical stimulation for pain management.',
    revenueHint: 'Adds ~$18-25 per visit.',
  },
  {
    // Aquatic therapy often alone — suggest if they have land-based codes but no aquatic
    trigger: (codes) => codes.some(c => ['AQ', 'AQ2', 'AQ3', 'AQ4', 'AQ5'].includes(c)) && !codes.some(c => ['ESM', 'ES'].includes(c)),
    suggest: ['ESM'],
    reason: 'Aquatic therapy visits often include E-Stim for additional treatment.',
    revenueHint: 'Adds ~$18-25 per visit.',
  },
];

/**
 * Get missing code suggestions for a set of selected codes.
 * @param {string[]} selectedCodes - Currently selected billing codes
 * @param {object} rates - Rate table { code: { payer: amount } }
 * @param {string} payer - Selected payer (for revenue estimates)
 * @param {Array} historicalEntries - Past billing_entries for learning patterns (optional)
 * @returns {Array<{ code, reason, revenueHint, estimatedAmount }>}
 */
export function getMissingCodeSuggestions(selectedCodes, rates, payer, historicalEntries = []) {
  if (!selectedCodes || selectedCodes.length === 0) return [];

  const suggestions = [];
  const alreadySuggested = new Set();

  // 1. Static rule-based suggestions
  for (const rule of STATIC_RULES) {
    if (rule.trigger(selectedCodes)) {
      for (const code of rule.suggest) {
        if (selectedCodes.includes(code) || alreadySuggested.has(code)) continue;
        const amount = payer ? ((rates[code] || {})[payer] || 0) : 0;
        if (payer && amount === 0) continue; // don't suggest codes not covered by this payer
        alreadySuggested.add(code);
        suggestions.push({
          code,
          reason: rule.reason,
          revenueHint: rule.revenueHint,
          estimatedAmount: amount,
          source: 'billing_pattern',
        });
      }
    }
  }

  // 2. Historical co-occurrence (if enough data)
  if (historicalEntries.length >= 10) {
    // Find entries that contain at least 2 of our selected codes
    const relevantEntries = historicalEntries.filter(e => {
      const eCodes = e.codes || [];
      let matches = 0;
      for (const c of selectedCodes) {
        if (eCodes.includes(c)) matches++;
        if (matches >= 2) return true;
      }
      return false;
    });

    if (relevantEntries.length >= 3) {
      // Count how often each code appears in these relevant entries
      const freq = {};
      relevantEntries.forEach(e => {
        (e.codes || []).forEach(c => {
          if (!selectedCodes.includes(c) && !alreadySuggested.has(c)) {
            freq[c] = (freq[c] || 0) + 1;
          }
        });
      });

      // Suggest codes that appear in >60% of similar visits
      const threshold = relevantEntries.length * 0.6;
      Object.entries(freq)
        .filter(([_, count]) => count >= threshold)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .forEach(([code, count]) => {
          const pct = Math.round((count / relevantEntries.length) * 100);
          const amount = payer ? ((rates[code] || {})[payer] || 0) : 0;
          if (payer && amount === 0) return;
          alreadySuggested.add(code);
          suggestions.push({
            code,
            reason: `${pct}% of similar visits in your history also billed this code.`,
            revenueHint: amount > 0 ? `Adds $${amount.toFixed(2)} per visit for ${payer}.` : '',
            estimatedAmount: amount,
            source: 'historical',
          });
        });
    }
  }

  return suggestions;
}
