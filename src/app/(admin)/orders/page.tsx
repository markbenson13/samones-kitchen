import { prisma } from "@/lib/prisma";
import { toDateInputValue, utcDateKey, formatGroupDate } from "@/lib/date";
import {
  createOrder,
  deleteOrder,
  toggleOrderPaymentStatus,
  toggleOrderDeliveryStatus,
} from "@/app/actions/orders";
import { OrderForm } from "./order-form";

export default async function OrdersPage() {
  const [orders, foodItems, sales] = await Promise.all([
    prisma.order.findMany({
      orderBy: { date: "desc" },
      include: { foodItem: true },
      take: 100,
    }),
    prisma.foodItem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.sale.findMany({
      select: { date: true, foodItem: { select: { id: true, name: true } } },
    }),
  ]);

  // "The menu for that day" = whichever food items were actually sold that
  // day, so the Order dropdown only offers what's realistically available.
  const menuByDate: Record<string, { id: string; name: string }[]> = {};
  for (const sale of sales) {
    const key = utcDateKey(sale.date);
    const list = (menuByDate[key] ??= []);
    if (!list.some((item) => item.id === sale.foodItem.id)) {
      list.push(sale.foodItem);
    }
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

      <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-brand-brown">Add order</h2>
        {foodItems.length === 0 ? (
          <p className="mt-4 text-sm text-brand-brown-light">
            Add an active food item first before recording an order.
          </p>
        ) : (
          <OrderForm
            action={createOrder}
            menuByDate={menuByDate}
            allFoodItems={foodItems.map((item) => ({
              id: item.id,
              name: item.name,
            }))}
            defaultDate={toDateInputValue(new Date())}
          />
        )}
      </section>

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
              <tbody
                key={group.key}
                className="divide-y divide-brand-tan/60 border-t-2 border-brand-tan"
              >
                <tr className="bg-brand-cream-dark/50">
                  <td
                    colSpan={2}
                    className="px-4 py-2 text-sm font-semibold text-brand-brown"
                  >
                    {group.label}
                  </td>
                  <td className="px-4 py-2 text-sm font-semibold text-brand-brown">
                    {group.subtotal}
                  </td>
                  <td colSpan={4} />
                </tr>
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
                        <button
                          type="submit"
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            order.paymentStatus === "Paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-neutral-200 text-neutral-600"
                          }`}
                        >
                          {order.paymentStatus}
                        </button>
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
                        <button
                          type="submit"
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            order.deliveryStatus === "Delivered"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-neutral-200 text-neutral-600"
                          }`}
                        >
                          {order.deliveryStatus}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-brand-brown-light">
                      {order.paymentMode}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteOrder.bind(null, order.id)}>
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        )}
      </section>
    </div>
  );
}
