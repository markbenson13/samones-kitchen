"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { toDateInputValue, parseDateInput } from "@/lib/date";
import { revalidatePath } from "next/cache";
import { addRegularContribution } from "./orders";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

function revalidateInventoryConsumers() {
  revalidatePath("/inventory");
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}

// Picks up an existing food item (one not already tracked) and starts
// holding a stock count for it — e.g. a dessert made in a batch and sold
// down over several days, instead of made-and-sold fresh each day.
export async function addToInventory(formData: FormData) {
  await requireAdmin();
  const foodItemId = String(formData.get("foodItemId") ?? "");
  const initialStock = Number(formData.get("initialStock") ?? 0);
  if (!foodItemId) throw new Error("Food item is required");
  if (!Number.isInteger(initialStock) || initialStock < 0) {
    throw new Error("Initial stock must be zero or a positive whole number");
  }
  await prisma.inventory.create({
    data: { foodItemId, stock: initialStock },
  });
  revalidateInventoryConsumers();
}

export async function removeFromInventory(id: string) {
  await requireAdmin();
  // Only stops tracking stock for the item — the food item itself, and all
  // its sales history, is untouched.
  await prisma.inventory.delete({ where: { id } });
  revalidateInventoryConsumers();
}

export async function restockInventory(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const quantity = Number(formData.get("quantity"));
  if (!id) throw new Error("Missing inventory item");
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Invalid quantity");
  }
  await prisma.inventory.update({
    where: { id },
    data: { stock: { increment: quantity } },
  });
  revalidateInventoryConsumers();
}

// Directly corrects the stock number — e.g. one was taken for personal/staff
// use rather than sold — with NO Sale-table/revenue effect, unlike
// sellFromInventory below. Use this when a unit left the stock for a reason
// other than a sale.
export async function setInventoryStock(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const stock = Number(formData.get("stock"));
  if (!id) throw new Error("Missing inventory item");
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error("Stock must be zero or a positive whole number");
  }
  await prisma.inventory.update({
    where: { id },
    data: { stock },
  });
  revalidateInventoryConsumers();
}

// A walk-in/counter sale recorded directly from the Inventory page — same
// "contributes to today's Sale row" effect a regular order would have (see
// addRegularContribution in orders.ts), so Dashboard revenue reporting
// doesn't miss dessert sales that never went through a formal Order. Unlike
// the automatic draw-down when an Order is placed, this is a deliberate
// manual action, so it validates against available stock instead of
// silently allowing it to go negative.
export async function sellFromInventory(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const quantity = Number(formData.get("quantity"));
  if (!id) throw new Error("Missing inventory item");
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Invalid quantity");
  }

  const inventory = await prisma.inventory.findUniqueOrThrow({
    where: { id },
    include: { foodItem: { select: { id: true, sellingPrice: true } } },
  });
  if (quantity > inventory.stock) {
    throw new Error(`Only ${inventory.stock} left in stock`);
  }

  const date = parseDateInput(toDateInputValue(new Date()));
  const unitPrice = Number(inventory.foodItem.sellingPrice);

  await prisma.inventory.update({
    where: { id },
    data: { stock: { decrement: quantity } },
  });

  await addRegularContribution(inventory.foodItem.id, date, quantity, unitPrice);

  revalidateInventoryConsumers();
}
