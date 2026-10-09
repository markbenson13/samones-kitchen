"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseDateInput } from "@/lib/date";
import { revalidatePath } from "next/cache";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

export async function upsertExpense(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const dateStr = String(formData.get("date") ?? "");
  const category = String(formData.get("category") ?? "");

  if (!description) throw new Error("Description is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");
  if (!EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])) {
    throw new Error("Invalid category");
  }

  const date = parseDateInput(dateStr);
  const data = { description, amount, date, category };

  if (id) {
    await prisma.expense.update({ where: { id }, data });
  } else {
    await prisma.expense.create({ data });
  }

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

export async function bulkUpdateExpenseCategory(ids: string[], category: string) {
  await requireAdmin();
  if (ids.length === 0) return;
  if (!EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])) {
    throw new Error("Invalid category");
  }
  await prisma.expense.updateMany({ where: { id: { in: ids } }, data: { category } });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}
