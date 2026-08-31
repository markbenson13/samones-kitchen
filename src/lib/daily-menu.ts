import { prisma } from "@/lib/prisma";
import { utcDateKey } from "@/lib/date";

export type DailyMenuItem = { id: string; name: string; sellingPrice: string };

export async function getDailyMenuByDate(): Promise<
  Record<string, DailyMenuItem[]>
> {
  const entries = await prisma.dailyMenu.findMany({
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
