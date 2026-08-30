"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

export async function upsertFoodItem(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const costPrice = Number(formData.get("costPrice"));
  const sellingPrice = Number(formData.get("sellingPrice"));

  if (!name) throw new Error("Name is required");
  if (!Number.isFinite(costPrice) || costPrice < 0)
    throw new Error("Invalid cost price");
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0)
    throw new Error("Invalid selling price");

  if (id) {
    await prisma.foodItem.update({
      where: { id },
      data: { name, category, costPrice, sellingPrice },
    });
  } else {
    await prisma.foodItem.create({
      data: { name, category, costPrice, sellingPrice },
    });
  }

  revalidatePath("/food-items");
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}

export async function toggleFoodItemActive(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.foodItem.update({ where: { id }, data: { isActive } });
  revalidatePath("/food-items");
  revalidatePath("/sales");
}

export async function deleteFoodItem(id: string) {
  await requireAdmin();

  const salesCount = await prisma.sale.count({ where: { foodItemId: id } });
  if (salesCount > 0) {
    throw new Error(
      "Cannot delete a food item that already has recorded sales. Mark it inactive instead."
    );
  }

  await prisma.foodItem.delete({ where: { id } });
  revalidatePath("/food-items");
}
