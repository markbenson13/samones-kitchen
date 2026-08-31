import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toDateInputValue, utcDateKey, formatGroupDate } from "@/lib/date";
import { toNumber } from "@/lib/money";
import {
  createOrder,
  deleteOrder,
  deleteOrders,
  toggleOrderPaymentStatus,
  toggleOrderDeliveryStatus,
  updateOrderPaymentMode,
} from "@/app/actions/orders";
import { addToDailyMenu, removeFromDailyMenu } from "@/app/actions/daily-menu";
import { OrdersDayPanel } from "./orders-day-panel";
import { OrdersTable } from "./orders-table";
import { Pagination } from "@/components/pagination";
import { SubmitButton } from "@/components/submit-button";

const PAGE_SIZE = 25;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; payment?: string; delivery?: string }>;
}) {
  const { page: pageParam, payment: paymentParam, delivery: deliveryParam } =
    await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const payment =
    paymentParam === "Paid" || paymentParam === "Unpaid" ? paymentParam : undefined;
  const delivery =
    deliveryParam === "Delivered" || deliveryParam === "Pending"
      ? deliveryParam
      : undefined;
  const where = {
    ...(payment ? { paymentStatus: payment } : {}),
    ...(delivery ? { deliveryStatus: delivery } : {}),
  };

  const [orders, ordersCount, customerNameRows, foodItems, dailyMenuEntries] =
    await Promise.all([
      prisma.order.findMany({
        where,
        // Most recently placed first within a day; orderGroupId is just a
        // tiebreaker so every row sharing one still lands contiguously
        // (required for the batching below) — it's a random UUID, not
        // chronological, so it can't be the primary sort on its own.
        orderBy: [{ date: "desc" }, { createdAt: "desc" }, { orderGroupId: "desc" }],
        include: { foodItem: true },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.order.count({ where }),
      // Unpaginated — the "Add order" form's customer autocomplete should
      // offer every customer ever ordered from, not just this page's.
      prisma.order.findMany({
        distinct: ["customerName"],
        select: { customerName: true },
        orderBy: { customerName: "asc" },
      }),
      prisma.foodItem.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.dailyMenu.findMany({
        include: {
          foodItem: { select: { id: true, name: true, sellingPrice: true } },
        },
      }),
    ]);
  const allCustomerNames = customerNameRows.map((o) => o.customerName);

  const totalPages = Math.max(1, Math.ceil(ordersCount / PAGE_SIZE));

  // "The menu for that day" = whatever's been explicitly added to that day's
  // menu, so the Order checklist only offers what's realistically available —
  // decoupled from Sale/MarketCost history.
  const menuByDate: Record<
    string,
    { id: string; name: string; sellingPrice: string }[]
  > = {};
  const menuByDateForManager: Record<
    string,
    { dailyMenuId: string; id: string; name: string }[]
  > = {};
  for (const entry of dailyMenuEntries) {
    const key = utcDateKey(entry.date);
    (menuByDate[key] ??= []).push({
      id: entry.foodItem.id,
      name: entry.foodItem.name,
      sellingPrice: entry.foodItem.sellingPrice.toString(),
    });
    (menuByDateForManager[key] ??= []).push({
      dailyMenuId: entry.id,
      id: entry.foodItem.id,
      name: entry.foodItem.name,
    });
  }

  // Within a day, an order placed as multiple items shares one orderGroupId
  // (older rows have none, so they're their own singleton "batch") — so
  // payment/delivery/mode can be shown and toggled once for the whole order.
  const groups: {
    key: string;
    label: string;
    subtotal: number;
    batches: {
      key: string;
      customerName: string;
      paymentStatus: string;
      deliveryStatus: string;
      paymentMode: string;
      totalAmount: number;
      items: {
        id: string;
        foodItemName: string;
        quantity: number;
        totalAmount: number;
        isSale: boolean;
      }[];
    }[];
  }[] = [];
  for (const order of orders) {
    const dayKey = utcDateKey(order.date);
    let group = groups[groups.length - 1];
    if (!group || group.key !== dayKey) {
      group = { key: dayKey, label: formatGroupDate(order.date), subtotal: 0, batches: [] };
      groups.push(group);
    }
    group.subtotal += order.quantity;

    const batchKey = order.orderGroupId ?? order.id;
    let batch = group.batches[group.batches.length - 1];
    if (!batch || batch.key !== batchKey) {
      batch = {
        key: batchKey,
        customerName: order.customerName,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        paymentMode: order.paymentMode,
        totalAmount: 0,
        items: [],
      };
      group.batches.push(batch);
    }
    // Uses the price snapshotted on the order itself (as of when it was
    // placed), not the food item's current price — so a later price change
    // doesn't retroactively change totals for orders already recorded.
    const itemTotal = order.quantity * toNumber(order.unitPrice.toString());
    batch.totalAmount += itemTotal;
    batch.items.push({
      id: order.id,
      foodItemName: order.foodItem.name,
      quantity: order.quantity,
      totalAmount: itemTotal,
      isSale: order.isSale,
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-brown">Orders</h1>
        <p className="mt-1 text-sm text-brand-brown-light">
          Track customer pre-orders — payment, delivery, and mode of payment.
        </p>
      </div>

      <OrdersDayPanel
        addMenuAction={addToDailyMenu}
        removeMenuAction={removeFromDailyMenu}
        menuByDateForManager={menuByDateForManager}
        createOrderAction={createOrder}
        menuByDateForOrder={menuByDate}
        allFoodItems={foodItems.map((item) => ({
          id: item.id,
          name: item.name,
          sellingPrice: item.sellingPrice.toString(),
        }))}
        allFoodItemNames={foodItems.map((item) => item.name)}
        allCustomerNames={allCustomerNames}
        defaultDate={toDateInputValue(new Date())}
      />

      <form suppressHydrationWarning className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Payment
          </label>
          <select
            name="payment"
            defaultValue={payment ?? "All"}
            className="mt-1 rounded-md border border-brand-tan px-3 py-2 text-sm"
          >
            <option value="All">All</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Delivery
          </label>
          <select
            name="delivery"
            defaultValue={delivery ?? "All"}
            className="mt-1 rounded-md border border-brand-tan px-3 py-2 text-sm"
          >
            <option value="All">All</option>
            <option value="Delivered">Delivered</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
        <SubmitButton
          pendingText="Applying…"
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
        >
          Apply
        </SubmitButton>
        <Link
          href="/orders"
          className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
        >
          Reset
        </Link>
      </form>

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        {groups.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brand-brown-light">
            {payment || delivery
              ? "No orders match this filter."
              : "No orders recorded yet."}
          </p>
        ) : (
          <OrdersTable
            groups={groups}
            toggleOrderPaymentStatus={toggleOrderPaymentStatus}
            toggleOrderDeliveryStatus={toggleOrderDeliveryStatus}
            updateOrderPaymentMode={updateOrderPaymentMode}
            deleteOrder={deleteOrder}
            bulkDeleteOrders={deleteOrders}
          />
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) => {
            const params = new URLSearchParams({ page: String(p) });
            if (payment) params.set("payment", payment);
            if (delivery) params.set("delivery", delivery);
            return `/orders?${params.toString()}`;
          }}
        />
      </section>
    </div>
  );
}
