// Medicare fee schedule rates for common PT CPT codes

export const RATE_TYPES = {
  MEDICARE: 'Medicare',
  COMMERCIAL: 'Commercial',
  WORKERS_COMP: 'Workers Comp',
  AUTO: 'Auto / PIP',
};

// Default Medicare rates (2024 national average)
export const DEFAULT_RATES = {
  '97161': { description: 'PT Eval – Low Complexity', medicare: 104.56 },
  '97162': { description: 'PT Eval – Moderate Complexity', medicare: 104.56 },
  '97163': { description: 'PT Eval – High Complexity', medicare: 104.56 },
  '97164': { description: 'PT Re-Evaluation', medicare: 62.44 },

  '97110': { description: 'Therapeutic Exercises', medicare: 33.09 },
  '97112': { description: 'Neuromuscular Re-education', medicare: 36.52 },
  '97116': { description: 'Gait Training', medicare: 31.18 },
  '97140': { description: 'Manual Therapy', medicare: 33.45 },
  '97530': { description: 'Therapeutic Activities', medicare: 37.98 },
  '97535': { description: 'Self-Care / Home Mgmt Training', medicare: 35.25 },
  '97542': { description: 'Wheelchair Management', medicare: 34.10 },
  '97750': { description: 'Physical Performance Test', medicare: 30.50 },

  '97010': { description: 'Hot / Cold Pack', medicare: 0.00 },
  '97012': { description: 'Mechanical Traction', medicare: 14.22 },
  '97014': { description: 'Electrical Stimulation (unattended)', medicare: 14.22 },
  '97018': { description: 'Paraffin Bath', medicare: 0.00 },

  '97032': { description: 'Electrical Stimulation (attended)', medicare: 21.64 },
  '97033': { description: 'Iontophoresis', medicare: 24.88 },
  '97035': { description: 'Ultrasound', medicare: 19.94 },
  '97036': { description: 'Hubbard Tank', medicare: 23.10 },

  '20560': { description: 'Dry Needling – 1-2 muscles', medicare: 0.00 },
  '20561': { description: 'Dry Needling – 3+ muscles', medicare: 0.00 },

  '97150': { description: 'Group Therapeutic Procedures', medicare: 18.16 },
  '97113': { description: 'Aquatic Therapy', medicare: 35.00 },
};

// Payer multipliers relative to Medicare
export const PAYER_MULTIPLIERS = {
  [RATE_TYPES.MEDICARE]: 1.0,
  [RATE_TYPES.COMMERCIAL]: 1.45,
  [RATE_TYPES.WORKERS_COMP]: 1.6,
  [RATE_TYPES.AUTO]: 1.8,
};

export function getRate(cptCode, payerType = RATE_TYPES.MEDICARE) {
  const entry = DEFAULT_RATES[cptCode];
  if (!entry) return 0;
  const multiplier = PAYER_MULTIPLIERS[payerType] || 1.0;
  return +(entry.medicare * multiplier).toFixed(2);
}

export function getAllCodes() {
  return Object.entries(DEFAULT_RATES).map(([code, info]) => ({
    code,
    ...info,
  }));
}
