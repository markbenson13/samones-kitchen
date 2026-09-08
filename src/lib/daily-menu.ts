import { prisma } from "@/lib/prisma";
import { utcDateKey } from "@/lib/date";

export type DailyMenuItem = { id: string; name: string; sellingPrice: string };

// This table only ever needs to answer "what could be picked for a day
// around now" (editing an order/sale's food item, or the Orders/Sales menu
// pickers) — a plain `findMany()` with no `where` at all fetched every
// DailyMenu row ever created, on every single Orders/Sales page load, with
// no bound on how far that grows. A rolling window comfortably covers real
// usage (nobody's editing a menu from years ago) while capping the worst
// case instead of scanning the whole table forever.
const WINDOW_DAYS_PAST = 730;
const WINDOW_DAYS_FUTURE = 60;

export function dailyMenuDateWindow(): { gte: Date; lte: Date } {
  const now = new Date();
  const gte = new Date(now);
  gte.setUTCDate(gte.getUTCDate() - WINDOW_DAYS_PAST);
  const lte = new Date(now);
  lte.setUTCDate(lte.getUTCDate() + WINDOW_DAYS_FUTURE);
  return { gte, lte };
}

export async function getDailyMenuByDate(): Promise<
  Record<string, DailyMenuItem[]>
> {
  const entries = await prisma.dailyMenu.findMany({
    where: { date: dailyMenuDateWindow() },
    include: {
      foodItem: { select: { id: true, name: true, sellingPrice: true } },
    },
  });

  const menuByDate: Record<string, DailyMenuItem[]> = {};
  for (const entry of entries) {
    const key = utcDateKey(entry.date);
    const list = (menuByDate[key] ??= []);
    list.push({
      id: entry.foodItem.id,
      name: entry.foodItem.name,
      sellingPrice: entry.foodItem.sellingPrice.toString(),
    });
  }
  return menuByDate;
}
