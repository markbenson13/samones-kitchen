"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

// A row's effective group is orderGroupId if set, else its own id (for rows
// created before this field existed, or any other singleton order).
function groupWhere(groupKey: string) {
  return { OR: [{ orderGroupId: groupKey }, { id: groupKey }] };
}

export async function createOrder(formData: FormData) {
  await requireAdmin();

  const customerName = String(formData.get("customerName") ?? "").trim();
  const paymentStatus = String(formData.get("paymentStatus") ?? "Unpaid");
  const deliveryStatus = String(formData.get("deliveryStatus") ?? "Pending");
  const paymentMode = String(formData.get("paymentMode") ?? "Cash");
  const dateStr = String(formData.get("date") ?? "");

  if (!customerName) throw new Error("Customer name / unit is required");

  // A customer can order more than one ulam in a single submission — each
  // checked item becomes its own Order row, sharing one orderGroupId so the
  // whole order can be tracked and toggled together.
  const foodItemIds = formData.getAll("foodItemIds").map(String);
  if (foodItemIds.length === 0)
    throw new Error("Select at least one item to order");

  const items = foodItemIds.map((foodItemId) => {
    const quantity = Number(formData.get(`quantity_${foodItemId}`));
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Invalid quantity for one of the selected items");
    }
    return { foodItemId, quantity };
  });

  const foodItems = await prisma.foodItem.findMany({
    where: { id: { in: foodItemIds } },
    select: { id: true, sellingPrice: true },
  });
  if (foodItems.length !== foodItemIds.length)
    throw new Error("One of the selected food items was not found");
  const priceById = new Map(foodItems.map((f) => [f.id, f.sellingPrice]));

  const date = dateStr ? new Date(dateStr) : new Date();
  const orderGroupId = randomUUID();

  await prisma.order.createMany({
    data: items.map(({ foodItemId, quantity }) => ({
      customerName,
      foodItemId,
      quantity,
      // Snapshot the price now, so a later change to the food item's selling
      // price doesn't retroactively change this order's total.
      unitPrice: priceById.get(foodItemId)!,
      paymentStatus,
      deliveryStatus,
      paymentMode,
      date,
      orderGroupId,
    })),
  });

  revalidatePath("/orders");
  revalidatePath("/sales");
}

export async function toggleOrderPaymentStatus(
  groupKey: string,
  paymentStatus: string
) {
  await requireAdmin();
  await prisma.order.updateMany({
    where: groupWhere(groupKey),
    data: { paymentStatus },
  });
  revalidatePath("/orders");
}

export async function toggleOrderDeliveryStatus(
  groupKey: string,
  deliveryStatus: string
) {
  await requireAdmin();
  await prisma.order.updateMany({
    where: groupWhere(groupKey),
    data: { deliveryStatus },
  });
  revalidatePath("/orders");
  revalidatePath("/sales");
}

export async function updateOrderPaymentMode(formData: FormData) {
  await requireAdmin();
  const groupKey = String(formData.get("groupKey") ?? "");
  const paymentMode = String(formData.get("paymentMode") ?? "Cash");
  await prisma.order.updateMany({
    where: groupWhere(groupKey),
    data: { paymentMode },
  });
  revalidatePath("/orders");
}

export async function deleteOrder(id: string) {
  await requireAdmin();
  await prisma.order.delete({ where: { id } });
  revalidatePath("/orders");
  revalidatePath("/sales");
}

export async function deleteOrders(ids: string[]) {
  await requireAdmin();
  if (ids.length === 0) return;
  await prisma.order.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/orders");
  revalidatePath("/sales");
}
