"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
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
  // checked item becomes its own Order row (own qty, but sharing the same
  // customer/payment/delivery/date), so status can still be tracked per item.
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

  const foodItemCount = await prisma.foodItem.count({
    where: { id: { in: foodItemIds } },
  });
  if (foodItemCount !== foodItemIds.length)
    throw new Error("One of the selected food items was not found");

  const date = dateStr ? new Date(dateStr) : new Date();

  await prisma.order.createMany({
    data: items.map(({ foodItemId, quantity }) => ({
      customerName,
      foodItemId,
      quantity,
      paymentStatus,
      deliveryStatus,
      paymentMode,
      date,
    })),
  });

  revalidatePath("/orders");
  revalidatePath("/sales");
}

export async function toggleOrderPaymentStatus(
  id: string,
  paymentStatus: string
) {
  await requireAdmin();
  await prisma.order.update({ where: { id }, data: { paymentStatus } });
  revalidatePath("/orders");
}

export async function toggleOrderDeliveryStatus(
  id: string,
  deliveryStatus: string
) {
  await requireAdmin();
  await prisma.order.update({ where: { id }, data: { deliveryStatus } });
  revalidatePath("/orders");
  revalidatePath("/sales");
}

export async function updateOrderPaymentMode(id: string, formData: FormData) {
  await requireAdmin();
  const paymentMode = String(formData.get("paymentMode") ?? "Cash");
  await prisma.order.update({ where: { id }, data: { paymentMode } });
  revalidatePath("/orders");
}

export async function deleteOrder(id: string) {
  await requireAdmin();
  await prisma.order.delete({ where: { id } });
  revalidatePath("/orders");
  revalidatePath("/sales");
}
