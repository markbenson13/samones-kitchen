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
  const foodItemId = String(formData.get("foodItemId") ?? "");
  const quantity = Number(formData.get("quantity"));
  const paymentStatus = String(formData.get("paymentStatus") ?? "Unpaid");
  const deliveryStatus = String(formData.get("deliveryStatus") ?? "Pending");
  const paymentMode = String(formData.get("paymentMode") ?? "Cash");
  const dateStr = String(formData.get("date") ?? "");

  if (!customerName) throw new Error("Customer name / unit is required");
  if (!foodItemId) throw new Error("Order (food item) is required");
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new Error("Invalid quantity");

  const foodItem = await prisma.foodItem.findUnique({
    where: { id: foodItemId },
  });
  if (!foodItem) throw new Error("Food item not found");

  const date = dateStr ? new Date(dateStr) : new Date();

  await prisma.order.create({
    data: {
      customerName,
      foodItemId,
      quantity,
      paymentStatus,
      deliveryStatus,
      paymentMode,
      date,
    },
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

export async function deleteOrder(id: string) {
  await requireAdmin();
  await prisma.order.delete({ where: { id } });
  revalidatePath("/orders");
  revalidatePath("/sales");
}
