"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

// Moves `amount` of "made" out of the regular-price row's own tally, down to
// (but not below) what it's already sold — mirrors the same one-time
// transfer done when a Sale-tagged order auto-creates a Sale row, but here
// for a Sale row entered directly on this form.
async function reduceRegularMade(foodItemId: string, date: Date, amount: number) {
  const regular = await prisma.sale.findFirst({
    where: { foodItemId, date, isSale: false },
  });
  if (!regular) return;
  const newMade = Math.max(regular.quantity, regular.quantityMade - amount);
  await prisma.sale.update({
    where: { id: regular.id },
    data: { quantityMade: newMade },
  });
}

// The reverse of reduceRegularMade, for when a Sale-tagged row entered here
// is deleted — restores what was transferred out of the regular row.
async function restoreRegularMade(foodItemId: string, date: Date, amount: number) {
  const regular = await prisma.sale.findFirst({
    where: { foodItemId, date, isSale: false },
  });
  if (!regular) return;
  await prisma.sale.update({
    where: { id: regular.id },
    data: { quantityMade: regular.quantityMade + amount },
  });
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

  const existing = id ? await prisma.sale.findUnique({ where: { id } }) : null;

  // Defaults to the food item's current selling price. The form only lets
  // this be lowered when "Sale" is checked, e.g. clearing out leftover
  // stock at a discount instead of requiring a separate duplicate food item
  // per price variant.
  let unitPrice: number | typeof foodItem.sellingPrice;
  if (isSale && unitPriceInput) {
    const override = Number(unitPriceInput);
    if (!Number.isFinite(override) || override < 0)
      throw new Error("Invalid unit price");
    unitPrice = override;
  } else if (existing && existing.foodItemId === foodItemId) {
    // No price override submitted (the price field is disabled whenever
    // "Sale" isn't checked, so disabled inputs never reach FormData) and
    // this edits the same item — preserve its current price/total instead
    // of silently re-deriving from the food item's live selling price,
    // which may have moved since the orders that built up this row's total
    // were placed (this row may hold real accumulated revenue now that
    // Orders auto-contribute to it).
    unitPrice = existing.unitPrice;
  } else {
    unitPrice = foodItem.sellingPrice;
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
    // A brand-new Sale-tagged entry transfers its "made" out of that day's
    // regular-price row (if any), so its own leftover reads 0 — matching the
    // same one-time transfer Orders does when a Sale order auto-creates one.
    if (isSale) {
      await reduceRegularMade(foodItemId, date, quantityMade);
    }
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
}

export async function deleteSale(id: string) {
  await requireAdmin();
  const sale = await prisma.sale.delete({ where: { id } });
  if (sale.isSale) {
    await restoreRegularMade(sale.foodItemId, sale.date, sale.quantityMade);
  }
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}

export async function deleteSales(ids: string[]) {
  await requireAdmin();
  if (ids.length === 0) return;
  // Fetched before deleting so any Sale-tagged rows' transfer can be
  // restored to the regular row it came out of.
  const sales = await prisma.sale.findMany({ where: { id: { in: ids } } });
  await prisma.sale.deleteMany({ where: { id: { in: ids } } });
  for (const sale of sales) {
    if (sale.isSale) {
      await restoreRegularMade(sale.foodItemId, sale.date, sale.quantityMade);
    }
  }
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}
