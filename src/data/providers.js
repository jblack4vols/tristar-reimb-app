export const PROVIDERS_MAP = {
  "Morristown":     ["Julia Bentley","Rachel Harris","Sydney Hurd (OT)","Donnie Newberry Jr","Kirsten Wright","Andrew Fowler"],
  "Maryville":      ["Kristen Bonk","Caitlin Neely","Emma Patterson (OT)"],
  "Bean Station":   ["Emily Moucha","Elizabeth Reece (OT)"],
  "Newport":        ["Kesley Kirk","Alexander McGlohon (OT)"],
  "Jefferson City": ["Nicholas Moore","Madison Misenheimer (OT)"],
  "Rogersville":    ["Logan Harris","Etta Rich (OT)"],
  "New Tazewell":   ["Jacob Runions"],
  "Johnson City":   ["Jeremy Cook","Kaiden Miller (OT)"],
  "PRN":            ["Jordan Black","Morgan Black"],
};

/**
 * Determine discipline type from provider name suffix:
 *   (OT) = Occupational Therapist
 *   (COTA) = Certified OT Assistant (uses OT evals)
 *   (PTA) = Physical Therapist Assistant (uses PT evals)
 *   No suffix = PT (Physical Therapist)
 */
export function getDiscipline(name) {
  if (name.includes('(COTA)')) return 'COTA';
  if (name.includes('(OT)'))   return 'OT';
  if (name.includes('(PTA)'))  return 'PTA';
  return 'PT';
}

export function isOTDiscipline(discipline) {
  return discipline === 'OT' || discipline === 'COTA';
}

export const ALL_PROVIDERS = Object.entries(PROVIDERS_MAP).flatMap(([loc, names]) =>
  names.map(n => {
    const discipline = getDiscipline(n);
    return { name: n, location: loc, isOT: isOTDiscipline(discipline), discipline };
  })
);
