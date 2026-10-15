"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseDateInput } from "@/lib/date";
import { toNumber, formatMoney } from "@/lib/money";
import { SAVING_TYPES } from "@/lib/saving-types";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

// Deposits minus withdrawals, all time — the running balance actually
// sitting in savings right now (see "Total saved" on the Savings page).
async function getSavingsBalance(): Promise<number> {
  const [row] = await prisma.$queryRaw<{ net: Prisma.Decimal }[]>`
    SELECT COALESCE(SUM(CASE WHEN type = 'Withdrawal' THEN -amount ELSE amount END), 0) AS net
    FROM "Saving"
  `;
  return toNumber(row.net);
}

export async function upsertSaving(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const dateStr = String(formData.get("date") ?? "");
  const type = String(formData.get("type") ?? "Deposit");

  if (!description) throw new Error("Note is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");
  if (!SAVING_TYPES.includes(type as (typeof SAVING_TYPES)[number])) {
    throw new Error("Invalid type");
  }

  // Only guarded on create — an edit to an existing entry is a correction,
  // not a new draw against the current balance, and recomputing "current
  // balance as of that past entry" isn't worth the complexity here.
  if (type === "Withdrawal" && !id) {
    const balance = await getSavingsBalance();
    if (amount > balance) {
      throw new Error(`Only ${formatMoney(balance)} available in savings`);
    }
  }

  const date = parseDateInput(dateStr);
  const data = { description, amount, date, type };

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
