import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import {
  toDateInputValue,
  utcDateKey,
  formatGroupDate,
  formatRangeDate,
} from "@/lib/date";
import {
  createMarketCost,
  deleteMarketCost,
  deleteMarketCosts,
} from "@/app/actions/market-costs";
import { SubmitButton } from "@/components/submit-button";
import { Pagination } from "@/components/pagination";
import { MarketCostsTable } from "./market-costs-table";

const DEFAULT_RANGE_DAYS = 30;
const PAGE_SIZE = 25;

export default async function MarketCostsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; page?: string }>;
}) {
  const { from: fromParam, to: toParam, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - (DEFAULT_RANGE_DAYS - 1));

  const fromDate = fromParam ? new Date(fromParam) : defaultFrom;
  const toDate = toParam ? new Date(toParam) : today;
  // `lt` the day after `to` so the whole `to` day (stored at UTC midnight) is included.
  const toDateExclusive = new Date(toDate);
  toDateExclusive.setUTCDate(toDateExclusive.getUTCDate() + 1);

  const where = { date: { gte: fromDate, lt: toDateExclusive } };

  const [marketCosts, totalCount, totalAgg] = await Promise.all([
    prisma.marketCost.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.marketCost.count({ where }),
    prisma.marketCost.aggregate({ where, _sum: { amount: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const total = toNumber(totalAgg._sum.amount?.toString() ?? "0");

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
        <form suppressHydrationWarning
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

      <form suppressHydrationWarning className="flex flex-wrap items-end gap-3">
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
          <MarketCostsTable
            groups={groups.map((group) => ({
              ...group,
              items: group.items.map((cost) => ({
                id: cost.id,
                description: cost.description,
                quantity: cost.quantity,
                amount: cost.amount.toString(),
              })),
            }))}
            deleteAction={deleteMarketCost}
            bulkDeleteAction={deleteMarketCosts}
            totalLabel={`Total (${formatRangeDate(fromDate)} – ${formatRangeDate(toDate)})`}
            total={total}
          />
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) =>
            `/market-costs?from=${utcDateKey(fromDate)}&to=${utcDateKey(toDate)}&page=${p}`
          }
        />
      </section>
    </div>
  );
}
