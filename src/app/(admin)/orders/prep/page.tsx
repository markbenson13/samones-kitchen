import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toDateInputValue, formatGroupDate } from "@/lib/date";
import { PrintButton } from "@/components/print-button";

export default async function OrdersPrepPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam || toDateInputValue(new Date());
  const dateValue = new Date(date);

  const orders = await prisma.order.findMany({
    where: { date: dateValue },
    include: { foodItem: { select: { name: true } } },
  });

  // Totaled by food item — this is a "how much to cook" list, not an
  // order-by-order breakdown (that's what the main Orders table is for), so
  // customer/payment/delivery details are deliberately left out.
  const totals = new Map<string, { name: string; quantity: number; orders: number }>();
  for (const order of orders) {
    const existing = totals.get(order.foodItemId);
    if (existing) {
      existing.quantity += order.quantity;
      existing.orders += 1;
    } else {
      totals.set(order.foodItemId, {
        name: order.foodItem.name,
        quantity: order.quantity,
        orders: 1,
      });
    }
  }
  const rows = Array.from(totals.values()).sort((a, b) => b.quantity - a.quantity);
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/orders?date=${date}`}
          className="text-sm font-medium text-brand-brown hover:underline"
        >
          ← Back to Orders
        </Link>
        <PrintButton className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark" />
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-brand-brown">
          Kitchen prep list
        </h1>
        <p className="mt-1 text-sm text-brand-brown-light">
          {formatGroupDate(dateValue)} — how much of each ulam to make, based
          on orders placed for this day.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-brand-tan bg-white p-6 text-sm text-brand-brown-light">
          No orders recorded for this day yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm print:border-0 print:shadow-none">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-cream text-xs uppercase text-brand-brown-light print:bg-transparent">
              <tr>
                <th className="px-4 py-3">Food item</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Total to make</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-tan/60">
              {rows.map((row) => (
                <tr key={row.name}>
                  <td className="px-4 py-3 font-medium text-brand-brown">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-brand-brown-light">
                    {row.orders}
                  </td>
                  <td className="px-4 py-3 text-lg font-semibold text-brand-brown">
                    {row.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-brand-tan bg-brand-cream print:bg-transparent">
              <tr>
                <td className="px-4 py-3 font-medium text-brand-brown" colSpan={2}>
                  Total tubs to make
                </td>
                <td className="px-4 py-3 text-lg font-semibold text-brand-brown">
                  {totalQuantity}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
