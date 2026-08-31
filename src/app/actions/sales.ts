"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

export async function upsertSale(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim() || null;
  const foodItemId = String(formData.get("foodItemId") ?? "");
  const quantityMade = Number(formData.get("quantityMade"));
  const quantity = Number(formData.get("quantity"));
  const isSale = formData.get("isSale") === "on";
  // The price input is only enabled (and submitted) when "Sale" is checked.
  const unitPriceInput = String(formData.get("unitPrice") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");

  if (!foodItemId) throw new Error("Food item is required");
  if (!Number.isInteger(quantityMade) || quantityMade <= 0)
    throw new Error("Invalid tubs made");
  if (!Number.isInteger(quantity) || quantity < 0)
    throw new Error("Invalid sold quantity");
  if (quantity > quantityMade)
    throw new Error("Sold quantity cannot exceed tubs made");

  const foodItem = await prisma.foodItem.findUnique({
    where: { id: foodItemId },
  });
  if (!foodItem) throw new Error("Food item not found");

  // Defaults to the food item's current selling price. The form only lets
  // this be lowered when "Sale" is checked, e.g. clearing out leftover
  // stock at a discount instead of requiring a separate duplicate food item
  // per price variant.
  let unitPrice: number | typeof foodItem.sellingPrice = foodItem.sellingPrice;
  if (isSale && unitPriceInput) {
    const override = Number(unitPriceInput);
    if (!Number.isFinite(override) || override < 0)
      throw new Error("Invalid unit price");
    unitPrice = override;
  }

  const date = dateStr ? new Date(dateStr) : new Date();
  const totalAmount = Number(unitPrice) * quantity;

  if (id) {
    await prisma.sale.update({
      where: { id },
      data: { foodItemId, quantityMade, quantity, unitPrice, totalAmount, isSale, date },
    });
  } else {
    await prisma.sale.create({
      data: { foodItemId, quantityMade, quantity, unitPrice, totalAmount, isSale, date },
    });
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
}

export async function deleteSale(id: string) {
  await requireAdmin();
  await prisma.sale.delete({ where: { id } });
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}

export async function deleteSales(ids: string[]) {
  await requireAdmin();
  if (ids.length === 0) return;
  await prisma.sale.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}
