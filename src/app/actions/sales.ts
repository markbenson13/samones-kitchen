"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

export async function createSale(formData: FormData) {
  await requireAdmin();

  const foodItemId = String(formData.get("foodItemId") ?? "");
  const quantity = Number(formData.get("quantity"));
  const leftover = Number(formData.get("leftover") ?? 0);
  const unitPriceInput = String(formData.get("unitPrice") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");

  if (!foodItemId) throw new Error("Food item is required");
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new Error("Invalid quantity");
  if (!Number.isInteger(leftover) || leftover < 0)
    throw new Error("Invalid leftover");

  const foodItem = await prisma.foodItem.findUnique({
    where: { id: foodItemId },
  });
  if (!foodItem) throw new Error("Food item not found");

  // Defaults to the food item's current selling price, but the form allows
  // overriding it (e.g. a discounted clearance sale) instead of requiring a
  // separate duplicate food item per price variant.
  let unitPrice: number | typeof foodItem.sellingPrice = foodItem.sellingPrice;
  if (unitPriceInput) {
    const override = Number(unitPriceInput);
    if (!Number.isFinite(override) || override < 0)
      throw new Error("Invalid unit price");
    unitPrice = override;
  }

  const totalAmount = Number(unitPrice) * quantity;
  const date = dateStr ? new Date(dateStr) : new Date();

  await prisma.sale.create({
    data: { foodItemId, quantity, leftover, unitPrice, totalAmount, date },
  });

  revalidatePath("/sales");
  revalidatePath("/dashboard");
}

export async function deleteSale(id: string) {
  await requireAdmin();
  await prisma.sale.delete({ where: { id } });
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}
