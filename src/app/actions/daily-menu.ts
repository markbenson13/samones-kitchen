"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseDateInput } from "@/lib/date";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

function revalidateMenuConsumers() {
  revalidatePath("/orders");
  revalidatePath("/sales");
}

export async function addToDailyMenu(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");

  if (!name) throw new Error("Dish name is required");

  const date = parseDateInput(dateStr);

  // Reuse an existing food item by name (case-insensitive), or quick-create
  // one with placeholder pricing — the point is adding to the menu shouldn't
  // require setting up cost/selling price first. Fix those up later on the
  // Food Items page.
  let foodItem = await prisma.foodItem.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  let isNewFoodItem = false;
  if (!foodItem) {
    foodItem = await prisma.foodItem.create({
      data: { name, costPrice: 0, sellingPrice: 0 },
    });
    isNewFoodItem = true;
  }

  await prisma.dailyMenu.upsert({
    where: { date_foodItemId: { date, foodItemId: foodItem.id } },
    create: { date, foodItemId: foodItem.id },
    update: {},
  });

  revalidateMenuConsumers();
  // Only quick-creating a brand-new food item actually changes what /food-items
  // shows — reusing an existing one (the common case) doesn't, so that page
  // doesn't need to re-render on every menu addition.
  if (isNewFoodItem) revalidatePath("/food-items");
}

const DEFAULT_MENU_ITEM_NAME = "Rice";

// Seeds "Rice" onto a day's menu the first time that day is touched, so the
// admin doesn't have to re-add it by hand every single day — only runs when
// the day has no menu at all yet, so deliberately removing Rice for one day
// sticks (this doesn't re-add it behind their back on a later visit).
export async function ensureDefaultMenuForDate(date: Date) {
  await requireAdmin();
  const hasMenu = await prisma.dailyMenu.findFirst({ where: { date } });
  if (hasMenu) return;

  let foodItem = await prisma.foodItem.findFirst({
    where: { name: { equals: DEFAULT_MENU_ITEM_NAME, mode: "insensitive" } },
  });
  if (!foodItem) {
    foodItem = await prisma.foodItem.create({
      data: { name: DEFAULT_MENU_ITEM_NAME, costPrice: 0, sellingPrice: 0 },
    });
  }

  await prisma.dailyMenu.upsert({
    where: { date_foodItemId: { date, foodItemId: foodItem.id } },
    create: { date, foodItemId: foodItem.id },
    update: {},
  });
}

export async function removeFromDailyMenu(id: string) {
  await requireAdmin();
  await prisma.dailyMenu.delete({ where: { id } });
  revalidateMenuConsumers();
}
