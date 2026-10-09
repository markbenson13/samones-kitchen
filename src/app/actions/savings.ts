"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseDateInput } from "@/lib/date";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

export async function upsertSaving(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const dateStr = String(formData.get("date") ?? "");

  if (!description) throw new Error("Note is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

  const date = parseDateInput(dateStr);
  const data = { description, amount, date };

  if (id) {
    await prisma.saving.update({ where: { id }, data });
  } else {
    await prisma.saving.create({ data });
  }

  revalidatePath("/savings");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function deleteSaving(id: string) {
  await requireAdmin();
  await prisma.saving.delete({ where: { id } });
  revalidatePath("/savings");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function deleteSavings(ids: string[]) {
  await requireAdmin();
  if (ids.length === 0) return;
  await prisma.saving.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/savings");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}
