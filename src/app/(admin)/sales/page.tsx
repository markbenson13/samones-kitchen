import { prisma } from "@/lib/prisma";
import { formatMoney, toNumber } from "@/lib/money";
import { toDateInputValue } from "@/lib/date";
import { createSale, deleteSale } from "@/app/actions/sales";

export default async function SalesPage() {
  const [sales, foodItems] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { date: "desc" },
      include: { foodItem: true },
      take: 100,
    }),
    prisma.foodItem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const total = sales.reduce(
    (sum, sale) => sum + toNumber(sale.totalAmount.toString()),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Sales</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Record each sale using the current selling price of a food item.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Record sale</h2>
        {foodItems.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            Add an active food item first before recording a sale.
          </p>
        ) : (
          <form
            action={createSale}
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-neutral-600">
                Food item
              </label>
              <select
                name="foodItemId"
                required
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                {foodItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({formatMoney(item.sellingPrice.toString())})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600">
                Quantity
              </label>
              <input
                name="quantity"
                type="number"
                step="1"
                min="1"
                defaultValue={1}
                required
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600">
                Date
              </label>
              <input
                name="date"
                type="date"
                defaultValue={toDateInputValue(new Date())}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end lg:col-span-4">
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Record sale
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Food item</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Unit price</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-4 py-3 text-neutral-500">
                  {sale.date.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-medium text-neutral-900">
                  {sale.foodItem.name}
                </td>
                <td className="px-4 py-3">{sale.quantity}</td>
                <td className="px-4 py-3">
                  {formatMoney(sale.unitPrice.toString())}
                </td>
                <td className="px-4 py-3">
                  {formatMoney(sale.totalAmount.toString())}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteSale.bind(null, sale.id)}>
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
            {sales.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-neutral-500"
                >
                  No sales recorded yet.
                </td>
              </tr>
            )}
          </tbody>
          {sales.length > 0 && (
            <tfoot className="border-t border-neutral-200 bg-neutral-50">
              <tr>
                <td className="px-4 py-3 font-medium text-neutral-900" colSpan={4}>
                  Total (last {sales.length})
                </td>
                <td className="px-4 py-3 font-semibold text-neutral-900">
                  {formatMoney(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </section>
    </div>
  );
}
