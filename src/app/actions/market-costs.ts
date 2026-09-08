"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseDateInput } from "@/lib/date";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

export async function upsertMarketCost(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim() || null;
  const amount = Number(formData.get("amount"));
  const dateStr = String(formData.get("date") ?? "");

  if (!description) throw new Error("Description is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

  const date = parseDateInput(dateStr);
  const data = { description, quantity, amount, date };

  if (id) {
    await prisma.marketCost.update({ where: { id }, data });
  } else {
    await prisma.marketCost.create({ data });
  }

  revalidatePath("/market-costs");
  revalidatePath("/dashboard");
}

// Logs several items from one market trip in a single submission — the
// form sends them as indexed fields (description_0, amount_0, description_1,
// ...) sharing one date, instead of requiring one full form submit per item.
export async function createMarketCosts(formData: FormData) {
  await requireAdmin();

  const dateStr = String(formData.get("date") ?? "");
  const date = parseDateInput(dateStr);
  const rowCount = Number(formData.get("rowCount") ?? "0");

  const items: { description: string; quantity: string | null; amount: number }[] =
    [];
  for (let i = 0; i < rowCount; i++) {
    const description = String(formData.get(`description_${i}`) ?? "").trim();
    // A blank trailing row (e.g. the admin added one more slot than they
    // filled in) is silently skipped rather than failing the whole batch.
    if (!description) continue;
    const quantity = String(formData.get(`quantity_${i}`) ?? "").trim() || null;
    const amount = Number(formData.get(`amount_${i}`));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Invalid amount for "${description}"`);
    }
    items.push({ description, quantity, amount });
  }
  if (items.length === 0) throw new Error("Add at least one item");

  await prisma.marketCost.createMany({
    data: items.map((item) => ({ ...item, date })),
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

export async function deleteMarketCosts(ids: string[]) {
  await requireAdmin();
  if (ids.length === 0) return;
  await prisma.marketCost.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/market-costs");
  revalidatePath("/dashboard");
}
