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

const PAGE_SIZE = 25;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [orders, ordersCount, customerNameRows, foodItems, dailyMenuEntries] =
    await Promise.all([
      prisma.order.findMany({
        // Secondary sort by orderGroupId so every row sharing one guarantees
        // to land contiguously — required for batchesFor() below.
        orderBy: [{ date: "desc" }, { orderGroupId: "desc" }],
        include: { foodItem: true },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.order.count(),
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

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        {groups.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brand-brown-light">
            No orders recorded yet.
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
          buildHref={(p) => `/orders?page=${p}`}
        />
      </section>
    </div>
  );
}
