"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

export async function createExpense(formData: FormData) {
  await requireAdmin();

  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const dateStr = String(formData.get("date") ?? "");

  if (!description) throw new Error("Description is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

  const date = dateStr ? new Date(dateStr) : new Date();

  await prisma.expense.create({
    data: { description, amount, date },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function deleteExpense(id: string) {
  await requireAdmin();
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function deleteExpenses(ids: string[]) {
  await requireAdmin();
  if (ids.length === 0) return;
  await prisma.expense.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}
