"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

export async function createMarketCost(formData: FormData) {
  await requireAdmin();

  const description = String(formData.get("description") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim() || null;
  const amount = Number(formData.get("amount"));
  const dateStr = String(formData.get("date") ?? "");

  if (!description) throw new Error("Description is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

  const date = dateStr ? new Date(dateStr) : new Date();

  await prisma.marketCost.create({
    data: { description, quantity, amount, date },
  });

  revalidatePath("/market-costs");
  revalidatePath("/dashboard");
}

export async function deleteMarketCost(id: string) {
  await requireAdmin();
  await prisma.marketCost.delete({ where: { id } });
  revalidatePath("/market-costs");
  revalidatePath("/dashboard");
}
