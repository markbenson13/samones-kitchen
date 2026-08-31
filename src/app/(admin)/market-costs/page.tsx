import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, toNumber } from "@/lib/money";
import {
  toDateInputValue,
  utcDateKey,
  formatGroupDate,
  formatRangeDate,
} from "@/lib/date";
import { createMarketCost, deleteMarketCost } from "@/app/actions/market-costs";
import { CollapsibleGroup } from "@/components/collapsible-group";
import { SubmitButton } from "@/components/submit-button";

const DEFAULT_RANGE_DAYS = 30;

export default async function MarketCostsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - (DEFAULT_RANGE_DAYS - 1));

  const fromDate = fromParam ? new Date(fromParam) : defaultFrom;
  const toDate = toParam ? new Date(toParam) : today;
  // `lt` the day after `to` so the whole `to` day (stored at UTC midnight) is included.
  const toDateExclusive = new Date(toDate);
  toDateExclusive.setUTCDate(toDateExclusive.getUTCDate() + 1);

  const marketCosts = await prisma.marketCost.findMany({
    where: { date: { gte: fromDate, lt: toDateExclusive } },
    orderBy: { date: "desc" },
  });

  const total = marketCosts.reduce(
    (sum, cost) => sum + toNumber(cost.amount.toString()),
    0
  );

  const groups: {
    key: string;
    label: string;
    items: typeof marketCosts;
    subtotal: number;
  }[] = [];
  for (const cost of marketCosts) {
    const key = utcDateKey(cost.date);
    const amount = toNumber(cost.amount.toString());
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.key === key) {
      currentGroup.items.push(cost);
      currentGroup.subtotal += amount;
    } else {
      groups.push({
        key,
        label: formatGroupDate(cost.date),
        items: [cost],
        subtotal: amount,
      });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-brown">
          Market Costs
        </h1>
        <p className="mt-1 text-sm text-brand-brown-light">
          Log every trip to the market — ingredients, supplies, and other
          expenses.
        </p>
      </div>

      <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-brand-brown">Add cost</h2>
        <form
          action={createMarketCost}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-brand-brown-light">
              Description
            </label>
            <input
              name="description"
              type="text"
              required
              placeholder="e.g. Chicken, vegetables"
              className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-brown-light">
              Quantity
            </label>
            <input
              name="quantity"
              type="text"
              placeholder="e.g. 2kl, 1/4"
              className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-brown-light">
              Amount
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-brown-light">
              Date
            </label>
            <input
              name="date"
              type="date"
              defaultValue={toDateInputValue(new Date())}
              className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end lg:col-span-5">
            <SubmitButton
              pendingText="Adding…"
              className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
            >
              Add cost
            </SubmitButton>
          </div>
        </form>
      </section>

      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            From
          </label>
          <input
            name="from"
            type="date"
            defaultValue={utcDateKey(fromDate)}
            className="mt-1 rounded-md border border-brand-tan px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            To
          </label>
          <input
            name="to"
            type="date"
            defaultValue={utcDateKey(toDate)}
            className="mt-1 rounded-md border border-brand-tan px-3 py-2 text-sm"
          />
        </div>
        <SubmitButton
          pendingText="Applying…"
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
        >
          Apply
        </SubmitButton>
        <Link
          href="/market-costs"
          className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
        >
          Reset
        </Link>
      </form>

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        {groups.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brand-brown-light">
            No market costs logged in this period.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-cream text-xs uppercase text-brand-brown-light">
              <tr>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            {groups.map((group) => (
              <CollapsibleGroup
                key={group.key}
                label={group.label}
                labelColSpan={2}
                subtotal={formatMoney(group.subtotal)}
                trailingColSpan={1}
              >
                {group.items.map((cost) => (
                  <tr key={cost.id}>
                    <td className="px-4 py-3 font-medium text-brand-brown">
                      {cost.description}
                    </td>
                    <td className="px-4 py-3 text-brand-brown-light">
                      {cost.quantity ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {formatMoney(cost.amount.toString())}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteMarketCost.bind(null, cost.id)}>
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
            <tfoot className="border-t-2 border-brand-tan bg-brand-cream">
              <tr>
                <td
                  className="px-4 py-3 font-medium text-brand-brown"
                  colSpan={2}
                >
                  Total ({formatRangeDate(fromDate)} – {formatRangeDate(toDate)})
                </td>
                <td className="px-4 py-3 font-semibold text-brand-brown">
                  {formatMoney(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </div>
  );
}
