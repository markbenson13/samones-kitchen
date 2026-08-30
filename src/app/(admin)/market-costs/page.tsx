import { prisma } from "@/lib/prisma";
import { formatMoney, toNumber } from "@/lib/money";
import { toDateInputValue } from "@/lib/date";
import { createMarketCost, deleteMarketCost } from "@/app/actions/market-costs";

export default async function MarketCostsPage() {
  const marketCosts = await prisma.marketCost.findMany({
    orderBy: { date: "desc" },
  });

  const total = marketCosts.reduce(
    (sum, cost) => sum + toNumber(cost.amount.toString()),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Market Costs
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Log every trip to the market — ingredients, supplies, and other
          expenses.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Add cost</h2>
        <form
          action={createMarketCost}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-neutral-600">
              Description
            </label>
            <input
              name="description"
              type="text"
              required
              placeholder="e.g. Chicken, vegetables"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600">
              Amount
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
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
              Add cost
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {marketCosts.map((cost) => (
              <tr key={cost.id}>
                <td className="px-4 py-3 text-neutral-500">
                  {cost.date.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-medium text-neutral-900">
                  {cost.description}
                </td>
                <td className="px-4 py-3">
                  {formatMoney(cost.amount.toString())}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteMarketCost.bind(null, cost.id)}>
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
            {marketCosts.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-neutral-500"
                >
                  No market costs logged yet.
                </td>
              </tr>
            )}
          </tbody>
          {marketCosts.length > 0 && (
            <tfoot className="border-t border-neutral-200 bg-neutral-50">
              <tr>
                <td className="px-4 py-3 font-medium text-neutral-900">
                  Total
                </td>
                <td />
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
