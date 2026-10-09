// Keeps a food item picker list from interleaving desserts with main
// dishes — there's no dedicated "Desserts" category yet (desserts currently
// live under "Sides" alongside non-dessert items like Rice/vegetables), so
// this groups by the categories that actually exist today and puts "Sides"
// last, rather than trying to guess which individual items are desserts.
const CATEGORY_ORDER = ["Main Dishes", "Soups", "Sides"];

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
