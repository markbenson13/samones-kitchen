import { prisma } from "@/lib/prisma";
import { toDateInputValue, utcDateKey, formatGroupDate } from "@/lib/date";
import {
  createOrder,
  deleteOrder,
  toggleOrderPaymentStatus,
  toggleOrderDeliveryStatus,
  updateOrderPaymentMode,
} from "@/app/actions/orders";
import { addToDailyMenu, removeFromDailyMenu } from "@/app/actions/daily-menu";
import { OrdersDayPanel } from "./orders-day-panel";
import { OrdersTable } from "./orders-table";

export default async function OrdersPage() {
  const [orders, foodItems, dailyMenuEntries] = await Promise.all([
    prisma.order.findMany({
      // Secondary sort by orderGroupId so every row sharing one guarantees
      // to land contiguously — required for batchesFor() below.
      orderBy: [{ date: "desc" }, { orderGroupId: "desc" }],
      include: { foodItem: true },
      take: 100,
    }),
    prisma.foodItem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.dailyMenu.findMany({
      include: { foodItem: { select: { id: true, name: true } } },
    }),
  ]);

  // "The menu for that day" = whatever's been explicitly added to that day's
  // menu, so the Order checklist only offers what's realistically available —
  // decoupled from Sale/MarketCost history.
  const menuByDate: Record<string, { id: string; name: string }[]> = {};
  const menuByDateForManager: Record<
    string,
    { dailyMenuId: string; id: string; name: string }[]
  > = {};
  for (const entry of dailyMenuEntries) {
    const key = utcDateKey(entry.date);
    (menuByDate[key] ??= []).push(entry.foodItem);
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
      items: { id: string; foodItemName: string; quantity: number }[];
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
        items: [],
      };
      group.batches.push(batch);
    }
    batch.items.push({
      id: order.id,
      foodItemName: order.foodItem.name,
      quantity: order.quantity,
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
        }))}
        allFoodItemNames={foodItems.map((item) => item.name)}
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
          />
        )}
      </section>
    </div>
  );
}
