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
  const unitPriceInput = String(formData.get("unitPrice") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");

  if (!foodItemId) throw new Error("Food item is required");
  if (!Number.isInteger(quantityMade) || quantityMade <= 0)
    throw new Error("Invalid tubs made");

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

  const date = dateStr ? new Date(dateStr) : new Date();

  // Total (revenue) is based on however much was already ordered for this
  // food item on this date via the Orders form — recomputed on every save so
  // editing the food item or date re-derives it. Not stored as its own
  // "quantity sold" field; the Sales page separately derives Leftover/Total
  // live from Orders, so this stored snapshot only keeps the Dashboard's
  // revenue totals accurate as of the last save.
  const orderedAgg = await prisma.order.aggregate({
    where: { foodItemId, date },
    _sum: { quantity: true },
  });
  const orderedQuantity = orderedAgg._sum.quantity ?? 0;

  const totalAmount = Number(unitPrice) * orderedQuantity;

  if (id) {
    await prisma.sale.update({
      where: { id },
      data: { foodItemId, quantityMade, unitPrice, totalAmount, date },
    });
  } else {
    await prisma.sale.create({
      data: { foodItemId, quantityMade, unitPrice, totalAmount, date },
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
