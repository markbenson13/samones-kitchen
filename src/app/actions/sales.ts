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
  const dateStr = String(formData.get("date") ?? "");

  if (!foodItemId) throw new Error("Food item is required");
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new Error("Invalid quantity");

  const foodItem = await prisma.foodItem.findUnique({
    where: { id: foodItemId },
  });
  if (!foodItem) throw new Error("Food item not found");

  const unitPrice = foodItem.sellingPrice;
  const totalAmount = Number(unitPrice) * quantity;
  const date = dateStr ? new Date(dateStr) : new Date();

  await prisma.sale.create({
    data: { foodItemId, quantity, unitPrice, totalAmount, date },
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
