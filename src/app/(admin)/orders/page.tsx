import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toDateInputValue, utcDateKey, formatGroupDate } from "@/lib/date";
import { toNumber } from "@/lib/money";
import {
  createOrder,
  deleteOrder,
  deleteOrders,
  deleteOrderBatch,
  toggleOrderPaymentStatus,
  updateOrderDeliveryStatus,
  bulkUpdatePaymentStatus,
  bulkUpdateDeliveryStatus,
  updateOrderPaymentMode,
  updateOrderItem,
  addOrderItem,
} from "@/app/actions/orders";
import { addToDailyMenu, removeFromDailyMenu } from "@/app/actions/daily-menu";
import { dailyMenuDateWindow } from "@/lib/daily-menu";
import { OrdersDayPanel } from "./orders-day-panel";
import { OrdersTable } from "./orders-table";
import { SubmitButton } from "@/components/submit-button";
import { Pagination } from "@/components/pagination";
import { FilterForm } from "@/components/filter-form";

const PAGE_SIZE = 25;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    payment?: string;
    delivery?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const {
    date: dateParam,
    payment: paymentParam,
    delivery: deliveryParam,
    search: searchParam,
    page: pageParam,
  } = await searchParams;
  const date = dateParam || toDateInputValue(new Date());
  const payment =
    paymentParam === "Paid" || paymentParam === "Unpaid" ? paymentParam : undefined;
  const delivery =
    deliveryParam === "Delivered" ||
    deliveryParam === "For dispatch" ||
    deliveryParam === "Pending"
      ? deliveryParam
      : undefined;
  // A customer-name search spans every day (paginated), overriding the
  // single-day scope below — there was previously no way to answer "did
  // this customer order last week" short of paging through days one by one.
  const search = searchParam?.trim() || undefined;
  const page = Math.max(1, Number(pageParam) || 1);
  // Without a search, the orders table only ever shows the single day
  // selected as "Managing day" above it — a day's orders are naturally
  // bounded, so there's no need to page through unrelated older days to
  // find them.
  const where = {
    ...(search
      ? { customerName: { contains: search, mode: "insensitive" as const } }
      : { date: new Date(date) }),
    ...(payment ? { paymentStatus: payment } : {}),
    ...(delivery ? { deliveryStatus: delivery } : {}),
  };

  const [orders, ordersCount, foodItems, dailyMenuEntries] = await Promise.all([
    prisma.order.findMany({
      where,
      // Most recently placed first; orderGroupId is just a tiebreaker so
      // every row sharing one still lands contiguously (required for the
      // batching below) — it's a random UUID, not chronological, so it
      // can't be the primary sort on its own. Search mode spans many days,
      // so it also sorts by date first (the single-day view doesn't need
      // to, every row already shares one date).
      orderBy: search
        ? [{ date: "desc" }, { createdAt: "desc" }, { orderGroupId: "desc" }]
        : [{ createdAt: "desc" }, { orderGroupId: "desc" }],
      include: { foodItem: { select: { name: true } } },
      ...(search ? { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE } : {}),
    }),
    search ? prisma.order.count({ where }) : Promise.resolve(0),
    prisma.foodItem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.dailyMenu.findMany({
      where: { date: dailyMenuDateWindow() },
      include: {
        foodItem: { select: { id: true, name: true, sellingPrice: true } },
      },
    }),
  ]);
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
        foodItemId: string;
        foodItemName: string;
        quantity: number;
        unitPrice: number;
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
      foodItemId: order.foodItemId,
      foodItemName: order.foodItem.name,
      quantity: order.quantity,
      unitPrice: toNumber(order.unitPrice.toString()),
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
        defaultDate={date}
      />

      <FilterForm suppressHydrationWarning className="flex flex-wrap items-end gap-3">
        <input suppressHydrationWarning type="hidden" name="date" value={date} />
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Search customer / unit (all days)
          </label>
          <input suppressHydrationWarning
            name="search"
            type="text"
            placeholder="e.g. A-1234"
            defaultValue={search ?? ""}
            className="mt-1 w-56 rounded-md border border-brand-tan px-3 py-2 text-sm"
          />
        </div>
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
            <option value="Pending">Pending</option>
            <option value="For dispatch">For dispatch</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
        <SubmitButton
          pendingText="Applying…"
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
        >
          Apply
        </SubmitButton>
        <Link
          href={`/orders?date=${date}`}
          className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
        >
          Reset
        </Link>
      </FilterForm>
      {search && (
        <p className="-mt-4 text-xs text-brand-brown-light">
          Showing results for &quot;{search}&quot; across all days — not just
          the Managing day above.
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        {groups.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brand-brown-light">
            {search
              ? "No orders match this search."
              : payment || delivery
                ? "No orders match this filter for this day."
                : "No orders recorded for this day yet."}
          </p>
        ) : (
          <OrdersTable
            groups={groups}
            toggleOrderPaymentStatus={toggleOrderPaymentStatus}
            updateOrderDeliveryStatus={updateOrderDeliveryStatus}
            updateOrderPaymentMode={updateOrderPaymentMode}
            updateOrderItem={updateOrderItem}
            addOrderItem={addOrderItem}
            menuByDate={menuByDate}
            allFoodItems={foodItems.map((item) => ({
              id: item.id,
              name: item.name,
              sellingPrice: item.sellingPrice.toString(),
            }))}
            deleteOrder={deleteOrder}
            deleteOrderBatch={deleteOrderBatch}
            bulkDeleteOrders={deleteOrders}
            bulkUpdatePaymentStatus={bulkUpdatePaymentStatus}
            bulkUpdateDeliveryStatus={bulkUpdateDeliveryStatus}
          />
        )}
        {search && (
          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => {
              const params = new URLSearchParams({ date, search, page: String(p) });
              if (payment) params.set("payment", payment);
              if (delivery) params.set("delivery", delivery);
              return `/orders?${params.toString()}`;
            }}
          />
        )}
      </section>
    </div>
  );
}
