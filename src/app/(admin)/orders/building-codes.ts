// Buildings are grouped under their tower so the customer code (tower
// initial + building initial) is unique — Amina and Astra both start with
// "A", so a building-initial-only code collided ("A-1234" for either).
// Combining with the tower initial (Allegra/Amina -> "AA", Prisma/Astra ->
// "PA") fixes that without changing the picker itself.
export const BUILDING_TOWERS: Record<string, string[]> = {
  Prisma: ["Celeste", "Astra", "Kiran"],
  Allegra: ["Amina", "Soraya"],
  // Its own tower — a single building, not grouped under Prisma/Allegra.
  Lumiere: ["Lumiere"],
};
export const BUILDINGS = Object.values(BUILDING_TOWERS).flat();
const TOWER_BY_BUILDING = new Map(
  Object.entries(BUILDING_TOWERS).flatMap(([tower, buildings]) =>
    buildings.map((building) => [building, tower] as const)
  )
);

export function buildingCode(building: string): string {
  const trimmed = building.trim();
  const tower = TOWER_BY_BUILDING.get(trimmed);
  if (tower) return `${tower.charAt(0)}${trimmed.charAt(0)}`.toUpperCase();
  // A building typed in that isn't one of the known ones has no tower to
  // combine with — fall back to its own first two letters.
  return trimmed.slice(0, 2).toUpperCase();
}

// Reverses a stored customer code back into a building + unit number, to
// pre-fill an edit form. Only works for codes produced by the current
// tower+building scheme (exactly matches one building's derived code) —
// older single-letter codes (e.g. "A-1234", ambiguous between Amina/Astra)
// have no safe match, so the building falls back to the list's first entry
// and the admin picks the real one themselves.
export function parseCustomerName(customerName: string): {
  building: string;
  unitNumber: string;
} {
  const dashIndex = customerName.indexOf("-");
  const code = dashIndex === -1 ? customerName : customerName.slice(0, dashIndex);
  const unitNumber = dashIndex === -1 ? "" : customerName.slice(dashIndex + 1);
  const matched = BUILDINGS.find((b) => buildingCode(b) === code);
  return { building: matched ?? BUILDINGS[0], unitNumber };
}
