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
import { PaymentModeSelect } from "./payment-mode-select";
import { CollapsibleGroup } from "@/components/collapsible-group";
import { SubmitButton } from "@/components/submit-button";

export default async function OrdersPage() {
  const [orders, foodItems, dailyMenuEntries] = await Promise.all([
    prisma.order.findMany({
      orderBy: { date: "desc" },
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

  const groups: {
    key: string;
    label: string;
    items: typeof orders;
    subtotal: number;
  }[] = [];
  for (const order of orders) {
    const key = utcDateKey(order.date);
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.key === key) {
      currentGroup.items.push(order);
      currentGroup.subtotal += order.quantity;
    } else {
      groups.push({
        key,
        label: formatGroupDate(order.date),
        items: [order],
        subtotal: order.quantity,
      });
    }
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
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-cream text-xs uppercase text-brand-brown-light">
              <tr>
                <th className="px-4 py-3">Customer / unit</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            {groups.map((group) => (
              <CollapsibleGroup
                key={group.key}
                label={group.label}
                labelColSpan={2}
                subtotal={group.subtotal}
                trailingColSpan={4}
              >
                {group.items.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-medium text-brand-brown">
                      {order.customerName}
                    </td>
                    <td className="px-4 py-3 text-brand-brown-light">
                      {order.foodItem.name}
                    </td>
                    <td className="px-4 py-3">{order.quantity}</td>
                    <td className="px-4 py-3">
                      <form
                        action={toggleOrderPaymentStatus.bind(
                          null,
                          order.id,
                          order.paymentStatus === "Paid" ? "Unpaid" : "Paid"
                        )}
                      >
                        <SubmitButton
                          spinnerClassName="h-3 w-3"
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            order.paymentStatus === "Paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-neutral-200 text-neutral-600"
                          }`}
                        >
                          {order.paymentStatus}
                        </SubmitButton>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <form
                        action={toggleOrderDeliveryStatus.bind(
                          null,
                          order.id,
                          order.deliveryStatus === "Delivered"
                            ? "Pending"
                            : "Delivered"
                        )}
                      >
                        <SubmitButton
                          spinnerClassName="h-3 w-3"
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            order.deliveryStatus === "Delivered"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-neutral-200 text-neutral-600"
                          }`}
                        >
                          {order.deliveryStatus}
                        </SubmitButton>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <PaymentModeSelect
                        action={updateOrderPaymentMode.bind(null, order.id)}
                        defaultValue={order.paymentMode}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteOrder.bind(null, order.id)}>
                        <SubmitButton
                          spinnerClassName="h-3 w-3"
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </CollapsibleGroup>
            ))}
          </table>
        )}
      </section>
    </div>
  );
}
