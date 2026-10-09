// Keeps a food item picker/listing from interleaving categories messily —
// Main Dishes first, then Soups, then Sides, then Desserts, instead of
// whatever order rows happen to be created/fetched in. Driven entirely by
// the Food Item's own `category` field (editable on the Food Items page),
// not a hardcoded list of names — a prior version special-cased a fixed set
// of dessert item names here, which needed a code change every time a
// dessert was added, renamed, or missed (e.g. "Mango Graham - Solo" wasn't
// on it at first). Recategorizing an item on the Food Items page is now
// enough to fix its sort position everywhere this is used.
const CATEGORY_ORDER = ["Main Dishes", "Soups", "Sides", "Desserts"];

export function categoryRank(category: string | null | undefined): number {
  const index = CATEGORY_ORDER.indexOf(category ?? "");
  return index === -1 ? CATEGORY_ORDER.length : index;
}

export function sortByMenuOrder<T extends { name: string; category?: string | null }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const rankDiff = categoryRank(a.category) - categoryRank(b.category);
    return rankDiff !== 0 ? rankDiff : a.name.localeCompare(b.name);
  });
}
