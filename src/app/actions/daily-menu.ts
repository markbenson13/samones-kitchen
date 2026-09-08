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

export async function removeFromDailyMenu(id: string) {
  await requireAdmin();
  await prisma.dailyMenu.delete({ where: { id } });
  revalidateMenuConsumers();
}
