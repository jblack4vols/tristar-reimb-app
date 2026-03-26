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

export const ALL_PROVIDERS = Object.entries(PROVIDERS_MAP).flatMap(([loc, names]) =>
  names.map(n => ({ name: n, location: loc, isOT: n.includes("(OT)") }))
);
