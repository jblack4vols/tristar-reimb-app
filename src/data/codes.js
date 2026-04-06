// CPT code metadata: units, timing rules, and category groupings

export const CODE_CATEGORIES = {
  EVAL: 'Evaluation',
  THERAPEUTIC: 'Therapeutic Procedure',
  MODALITY_SUPERVISED: 'Modality – Supervised',
  MODALITY_ATTENDED: 'Modality – Constant Attendance',
  NEEDLING: 'Dry Needling',
  GROUP: 'Group / Aquatic',
};

export const CPT_CODES = {
  '97161': { category: CODE_CATEGORIES.EVAL, isTimed: false, maxUnits: 1, label: 'PT Eval – Low Complexity' },
  '97162': { category: CODE_CATEGORIES.EVAL, isTimed: false, maxUnits: 1, label: 'PT Eval – Moderate Complexity' },
  '97163': { category: CODE_CATEGORIES.EVAL, isTimed: false, maxUnits: 1, label: 'PT Eval – High Complexity' },
  '97164': { category: CODE_CATEGORIES.EVAL, isTimed: false, maxUnits: 1, label: 'PT Re-Evaluation' },

  '97110': { category: CODE_CATEGORIES.THERAPEUTIC, isTimed: true, maxUnits: 4, label: 'Therapeutic Exercises' },
  '97112': { category: CODE_CATEGORIES.THERAPEUTIC, isTimed: true, maxUnits: 4, label: 'Neuromuscular Re-ed' },
  '97116': { category: CODE_CATEGORIES.THERAPEUTIC, isTimed: true, maxUnits: 4, label: 'Gait Training' },
  '97140': { category: CODE_CATEGORIES.THERAPEUTIC, isTimed: true, maxUnits: 4, label: 'Manual Therapy' },
  '97530': { category: CODE_CATEGORIES.THERAPEUTIC, isTimed: true, maxUnits: 4, label: 'Therapeutic Activities' },
  '97535': { category: CODE_CATEGORIES.THERAPEUTIC, isTimed: true, maxUnits: 4, label: 'Self-Care / Home Mgmt' },
  '97542': { category: CODE_CATEGORIES.THERAPEUTIC, isTimed: true, maxUnits: 4, label: 'Wheelchair Mgmt' },
  '97750': { category: CODE_CATEGORIES.THERAPEUTIC, isTimed: true, maxUnits: 4, label: 'Physical Performance Test' },

  '97010': { category: CODE_CATEGORIES.MODALITY_SUPERVISED, isTimed: false, maxUnits: 1, label: 'Hot / Cold Pack' },
  '97012': { category: CODE_CATEGORIES.MODALITY_SUPERVISED, isTimed: false, maxUnits: 1, label: 'Mechanical Traction' },
  '97014': { category: CODE_CATEGORIES.MODALITY_SUPERVISED, isTimed: false, maxUnits: 1, label: 'E-Stim (unattended)' },
  '97018': { category: CODE_CATEGORIES.MODALITY_SUPERVISED, isTimed: false, maxUnits: 1, label: 'Paraffin Bath' },

  '97032': { category: CODE_CATEGORIES.MODALITY_ATTENDED, isTimed: true, maxUnits: 2, label: 'E-Stim (attended)' },
  '97033': { category: CODE_CATEGORIES.MODALITY_ATTENDED, isTimed: true, maxUnits: 2, label: 'Iontophoresis' },
  '97035': { category: CODE_CATEGORIES.MODALITY_ATTENDED, isTimed: true, maxUnits: 2, label: 'Ultrasound' },
  '97036': { category: CODE_CATEGORIES.MODALITY_ATTENDED, isTimed: true, maxUnits: 2, label: 'Hubbard Tank' },

  '20560': { category: CODE_CATEGORIES.NEEDLING, isTimed: false, maxUnits: 1, label: 'Dry Needling 1-2 muscles' },
  '20561': { category: CODE_CATEGORIES.NEEDLING, isTimed: false, maxUnits: 1, label: 'Dry Needling 3+ muscles' },

  '97150': { category: CODE_CATEGORIES.GROUP, isTimed: true, maxUnits: 4, label: 'Group Therapeutic' },
  '97113': { category: CODE_CATEGORIES.GROUP, isTimed: true, maxUnits: 4, label: 'Aquatic Therapy' },
};

// 8-minute rule: converts total minutes into billable units
export function minutesToUnits(minutes) {
  if (minutes < 8) return 0;
  if (minutes <= 22) return 1;
  if (minutes <= 37) return 2;
  if (minutes <= 52) return 3;
  if (minutes <= 67) return 4;
  if (minutes <= 82) return 5;
  if (minutes <= 97) return 6;
  return Math.ceil((minutes - 7) / 15);
}

export function getCodesByCategory() {
  const grouped = {};
  for (const [code, meta] of Object.entries(CPT_CODES)) {
    const cat = meta.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ code, ...meta });
  }
  return grouped;
}
