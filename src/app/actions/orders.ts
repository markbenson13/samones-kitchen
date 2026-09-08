"use server";

import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
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

// The regular-price Sale row for this food item/day, if one's been logged.
async function findRegularSale(foodItemId: string, date: Date) {
  return prisma.sale.findFirst({ where: { foodItemId, date, isSale: false } });
}

// Moves `amount` of "made" out of the regular-price row's own tally, down to
// (but not below) what it's already sold — i.e. its leftover becomes 0 once
// the transfer is reflected, since those tubs are no longer regular-price
// stock. Used the moment a Sale-tagged row is first created for a food
// item/day (the one-time "leftover becomes the sale batch" transfer).
async function reduceRegularMade(foodItemId: string, date: Date, amount: number) {
  const regular = await findRegularSale(foodItemId, date);
  if (!regular) return;
  const newMade = Math.max(regular.quantity, regular.quantityMade - amount);
  await prisma.sale.update({
    where: { id: regular.id },
    data: { quantityMade: newMade },
  });
}

// The reverse of reduceRegularMade — restores the regular row's "made" when
// the Sale-tagged row it was transferred into gets fully removed.
async function restoreRegularMade(foodItemId: string, date: Date, amount: number) {
  const regular = await findRegularSale(foodItemId, date);
  if (!regular) return;
  await prisma.sale.update({
    where: { id: regular.id },
    data: { quantityMade: regular.quantityMade + amount },
  });
}

// A "Sale" order represents leftover stock being cleared at a discount —
// fold it into (or start) that day's Sale-tagged Sale row for the same food
// item, so the Sales page reflects it without a separate manual entry.
//
// "made" on the Sale-tagged row is the regular row's leftover at the moment
// the Sale row is first created (how many tubs got moved over) — a one-time
// transfer that also reduces the regular row's own "made" so its leftover
// reads 0. "Sold" is what accumulates as more Sale orders come in, and can
// be less than "made" if not all the moved-over stock has sold yet.
async function addSaleCarryover(
  foodItemId: string,
  date: Date,
  quantity: number,
  unitPrice: number
) {
  const existing = await prisma.sale.findFirst({
    where: { foodItemId, date, isSale: true },
  });

  if (existing) {
    const newQuantity = existing.quantity + quantity;
    const newTotal = Number(existing.totalAmount) + unitPrice * quantity;
    await prisma.sale.update({
      where: { id: existing.id },
      data: {
        quantityMade: Math.max(existing.quantityMade, newQuantity),
        quantity: newQuantity,
        unitPrice: newTotal / newQuantity,
        totalAmount: newTotal,
      },
    });
  } else {
    const regular = await findRegularSale(foodItemId, date);
    const leftover = regular ? regular.quantityMade - regular.quantity : null;
    const made = Math.max(leftover ?? quantity, quantity);
    await prisma.sale.create({
      data: {
        foodItemId,
        date,
        quantityMade: made,
        quantity,
        unitPrice,
        totalAmount: unitPrice * quantity,
        isSale: true,
      },
    });
    if (leftover !== null) {
      await reduceRegularMade(foodItemId, date, made);
    }
  }
}

// The reverse of addSaleCarryover, for when a Sale order is deleted — undoes
// its contribution to that day's Sale-tagged row. If nothing's left on the
// row afterward (or it was already removed/edited away), the row is deleted
// and the transferred amount is restored to the regular row.
async function removeSaleCarryover(
  foodItemId: string,
  date: Date,
  quantity: number,
  unitPrice: number
) {
  const existing = await prisma.sale.findFirst({
    where: { foodItemId, date, isSale: true },
  });
  if (!existing) return;

  const newQuantity = existing.quantity - quantity;
  const newTotal = Number(existing.totalAmount) - unitPrice * quantity;

  if (newQuantity <= 0) {
    await prisma.sale.delete({ where: { id: existing.id } });
    await restoreRegularMade(foodItemId, date, existing.quantityMade);
    return;
  }

  await prisma.sale.update({
    where: { id: existing.id },
    data: {
      quantityMade: Math.max(existing.quantityMade, newQuantity),
      quantity: newQuantity,
      unitPrice: newTotal / newQuantity,
      totalAmount: newTotal,
    },
  });
}

// A regular order directly contributes to that day's regular-price Sale row
// for the food item — "sold" accumulates, "made" is never touched (it's a
// kitchen fact the admin owns; the automation should never guess/inflate
// it). If quantity later exceeds quantityMade, that's an intentional signal
// — SalesTable already renders it as a red "leftover", nudging the admin to
// go correct Tubs made, not a state to prevent.
async function addRegularContribution(
  foodItemId: string,
  date: Date,
  quantity: number,
  unitPrice: number
) {
  const existing = await findRegularSale(foodItemId, date);
  if (existing) {
    const newQuantity = existing.quantity + quantity;
    const newTotal = Number(existing.totalAmount) + unitPrice * quantity;
    await prisma.sale.update({
      where: { id: existing.id },
      data: {
        quantity: newQuantity,
        unitPrice: newTotal / newQuantity,
        totalAmount: newTotal,
      },
    });
  } else {
    // No regular Sales row logged yet for this item/day — create one,
    // seeding "Tubs made" with this order's quantity (a placeholder: "at
    // least this many were made"). Starts leftover at 0 rather than a
    // misleading large negative; the admin corrects it once they know the
    // real total production count.
    await prisma.sale.create({
      data: {
        foodItemId,
        date,
        quantityMade: quantity,
        quantity,
        unitPrice,
        totalAmount: unitPrice * quantity,
        isSale: false,
      },
    });
  }
}

// The reverse — subtracts a regular order's contribution back out.
// Deliberately NEVER deletes the row (unlike removeSaleCarryover's
// delete-when-empty): "quantityMade" may hold real, independently
// hand-entered kitchen data even if "sold" drops to 0, and — more
// importantly — leaving it untouched is required for correct composition
// when this is called as part of a regular->Sale toggle edit: removing the
// regular contribution first (leaving quantityMade untouched) lets
// addSaleCarryover's own leftover computation (quantityMade - quantity) size
// the new Sale row correctly. If this decremented quantityMade in lockstep,
// that would silently double-subtract and destroy hand-corrected production
// data. Do not "clean up" this asymmetry.
async function removeRegularContribution(
  foodItemId: string,
  date: Date,
  quantity: number,
  unitPrice: number
) {
  const existing = await findRegularSale(foodItemId, date);
  if (!existing) return;
  const newQuantity = Math.max(0, existing.quantity - quantity);
  const newTotal = Math.max(0, Number(existing.totalAmount) - unitPrice * quantity);
  await prisma.sale.update({
    where: { id: existing.id },
    data: {
      quantity: newQuantity,
      unitPrice: newQuantity > 0 ? newTotal / newQuantity : Number(existing.unitPrice),
      totalAmount: newTotal,
    },
  });
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
    // The price input is only enabled (and submitted) when "Sale" is
    // checked for this item, so its presence alone implies a discount.
    const isSale = formData.get(`sale_${foodItemId}`) === "on";
    const priceInput = formData.get(`price_${foodItemId}`);
    const unitPriceOverride =
      isSale && priceInput !== null && priceInput !== ""
        ? Number(priceInput)
        : null;
    if (unitPriceOverride !== null && !Number.isFinite(unitPriceOverride)) {
      throw new Error("Invalid unit price for one of the selected items");
    }
    if (unitPriceOverride !== null && unitPriceOverride < 0) {
      throw new Error("Unit price cannot be negative");
    }
    return { foodItemId, quantity, unitPriceOverride, isSale };
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
    data: items.map(({ foodItemId, quantity, unitPriceOverride, isSale }) => ({
      customerName,
      foodItemId,
      quantity,
      // Snapshot the price now (the current selling price, unless overridden
      // for a discounted/sale item), so a later change to the food item's
      // selling price doesn't retroactively change this order's total.
      unitPrice: unitPriceOverride ?? priceById.get(foodItemId)!,
      isSale,
      paymentStatus,
      deliveryStatus,
      paymentMode,
      date,
      orderGroupId,
    })),
  });

  for (const { foodItemId, quantity, unitPriceOverride, isSale } of items) {
    const unitPrice = unitPriceOverride ?? Number(priceById.get(foodItemId)!);
    if (isSale) {
      await addSaleCarryover(foodItemId, date, quantity, unitPrice);
    } else {
      await addRegularContribution(foodItemId, date, quantity, unitPrice);
    }
  }

  revalidatePath("/orders");
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}

// Adds one more line item to an already-placed order — for when a customer's
// order turns out to be missing something, without having to delete and
// recreate the whole batch (which would lose its original identity) or
// start a whole separate batch for the same customer.
export async function addOrderItem(formData: FormData) {
  await requireAdmin();

  const groupKey = String(formData.get("groupKey") ?? "");
  const foodItemId = String(formData.get("foodItemId") ?? "");
  const quantity = Number(formData.get("quantity"));
  if (!groupKey) throw new Error("Missing order");
  if (!foodItemId) throw new Error("Food item is required");
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Invalid quantity");
  }

  const isSale = formData.get("isSale") === "on";
  const priceInput = formData.get("price");
  const unitPriceOverride =
    isSale && priceInput !== null && priceInput !== ""
      ? Number(priceInput)
      : null;
  if (unitPriceOverride !== null && !Number.isFinite(unitPriceOverride)) {
    throw new Error("Invalid unit price");
  }
  if (unitPriceOverride !== null && unitPriceOverride < 0) {
    throw new Error("Unit price cannot be negative");
  }

  // Copy the batch's shared fields (customer, date, payment/delivery
  // status, mode) from an existing row in it onto the new item, so it joins
  // the same order rather than looking like a separate one.
  const existing = await prisma.order.findFirst({ where: groupWhere(groupKey) });
  if (!existing) throw new Error("Order not found");

  const foodItem = await prisma.foodItem.findUnique({
    where: { id: foodItemId },
    select: { sellingPrice: true },
  });
  if (!foodItem) throw new Error("Food item not found");
  const unitPrice = unitPriceOverride ?? Number(foodItem.sellingPrice);

  await prisma.order.create({
    data: {
      customerName: existing.customerName,
      foodItemId,
      quantity,
      unitPrice,
      isSale,
      paymentStatus: existing.paymentStatus,
      deliveryStatus: existing.deliveryStatus,
      paymentMode: existing.paymentMode,
      date: existing.date,
      // A legacy singleton row (no orderGroupId of its own) uses its own id
      // as its group key — assigning that same value here is what actually
      // turns it into a real multi-item batch going forward.
      orderGroupId: existing.orderGroupId ?? existing.id,
    },
  });

  if (isSale) {
    await addSaleCarryover(foodItemId, existing.date, quantity, unitPrice);
  } else {
    await addRegularContribution(foodItemId, existing.date, quantity, unitPrice);
  }

  revalidatePath("/orders");
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}

// Edits a single order line item's food item, quantity, and sale price in
// place instead of requiring delete-and-recreate. Reconciles the Sale
// carryover by unconditionally reversing the old contribution (if any) then
// reapplying the new one (if any) — algebraically equivalent to a
// delete-then-recreate for every transition (sale->sale with changed
// qty/price, sale->not-sale, not-sale->sale, not-sale->not-sale no-op).
// Order matters: remove-before-add is load-bearing, not stylistic.
export async function updateOrderItem(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const foodItemId = String(formData.get("foodItemId") ?? "");
  const quantity = Number(formData.get("quantity"));
  if (!id) throw new Error("Missing order item");
  if (!foodItemId) throw new Error("Food item is required");
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Invalid quantity");
  }

  const isSale = formData.get("isSale") === "on";
  const priceInput = formData.get("price");
  const unitPriceOverride =
    isSale && priceInput !== null && priceInput !== ""
      ? Number(priceInput)
      : null;
  if (unitPriceOverride !== null && !Number.isFinite(unitPriceOverride)) {
    throw new Error("Invalid unit price");
  }
  if (unitPriceOverride !== null && unitPriceOverride < 0) {
    throw new Error("Unit price cannot be negative");
  }

  const old = await prisma.order.findUniqueOrThrow({ where: { id } });

  const foodItem = await prisma.foodItem.findUnique({
    where: { id: foodItemId },
    select: { sellingPrice: true },
  });
  if (!foodItem) throw new Error("Food item not found");
  const unitPrice = unitPriceOverride ?? Number(foodItem.sellingPrice);

  await prisma.order.update({
    where: { id },
    data: { foodItemId, quantity, unitPrice, isSale },
  });

  if (old.isSale) {
    await removeSaleCarryover(
      old.foodItemId,
      old.date,
      old.quantity,
      Number(old.unitPrice)
    );
  } else {
    await removeRegularContribution(
      old.foodItemId,
      old.date,
      old.quantity,
      Number(old.unitPrice)
    );
  }
  if (isSale) {
    await addSaleCarryover(foodItemId, old.date, quantity, unitPrice);
  } else {
    await addRegularContribution(foodItemId, old.date, quantity, unitPrice);
  }
  // Note: restoreRegularMade doesn't mirror reduceRegularMade's floor, so a
  // floor-limited original transfer can over-restore here on a full
  // sale->not-sale edit — same pre-existing asymmetry plain deleteOrder has
  // always had, not introduced by this edit path.

  revalidatePath("/orders");
  revalidatePath("/sales");
  revalidatePath("/dashboard");
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

// Resolves the given order ids to their batches (same "whole batch, not
// just the checked row" semantics as toggleOrderPaymentStatus/
// toggleOrderDeliveryStatus above) and updates every order in each one —
// lets a bulk-selected set of rows be marked paid/delivered together
// instead of one batch at a time.
async function batchWhereForOrderIds(orderIds: string[]) {
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, orderGroupId: true },
  });
  const groupKeys = orders.map((o) => o.orderGroupId ?? o.id);
  return { OR: [{ orderGroupId: { in: groupKeys } }, { id: { in: groupKeys } }] };
}

export async function bulkUpdatePaymentStatus(
  orderIds: string[],
  paymentStatus: string
) {
  await requireAdmin();
  if (orderIds.length === 0) return;
  await prisma.order.updateMany({
    where: await batchWhereForOrderIds(orderIds),
    data: { paymentStatus },
  });
  revalidatePath("/orders");
}

export async function bulkUpdateDeliveryStatus(
  orderIds: string[],
  deliveryStatus: string
) {
  await requireAdmin();
  if (orderIds.length === 0) return;
  await prisma.order.updateMany({
    where: await batchWhereForOrderIds(orderIds),
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

async function reverseOrderContribution(order: {
  foodItemId: string;
  date: Date;
  quantity: number;
  unitPrice: Prisma.Decimal;
  isSale: boolean;
}) {
  if (order.isSale) {
    await removeSaleCarryover(
      order.foodItemId,
      order.date,
      order.quantity,
      Number(order.unitPrice)
    );
  } else {
    await removeRegularContribution(
      order.foodItemId,
      order.date,
      order.quantity,
      Number(order.unitPrice)
    );
  }
}

export async function deleteOrder(id: string) {
  await requireAdmin();
  const order = await prisma.order.delete({ where: { id } });
  await reverseOrderContribution(order);
  revalidatePath("/orders");
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}

// Shared by deleteOrders (by id list) and deleteOrderBatch (by group) —
// fetches the rows before deleting so each one's contribution (Sale-tagged
// or regular) can be reversed out of whichever Sale row it was folded into.
async function deleteOrdersWhere(where: Prisma.OrderWhereInput) {
  const orders = await prisma.order.findMany({ where });
  if (orders.length === 0) return;
  await prisma.order.deleteMany({ where });
  for (const order of orders) {
    await reverseOrderContribution(order);
  }
  revalidatePath("/orders");
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}

export async function deleteOrders(ids: string[]) {
  await requireAdmin();
  if (ids.length === 0) return;
  await deleteOrdersWhere({ id: { in: ids } });
}

// Cancels every item in one customer's order submission at once, instead of
// deleting each line item individually.
export async function deleteOrderBatch(groupKey: string) {
  await requireAdmin();
  await deleteOrdersWhere(groupWhere(groupKey));
}
