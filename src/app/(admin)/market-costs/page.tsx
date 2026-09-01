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
  upsertMarketCost,
  deleteMarketCost,
  deleteMarketCosts,
} from "@/app/actions/market-costs";
import { SubmitButton } from "@/components/submit-button";
import { Pagination } from "@/components/pagination";
import { MarketCostsSection } from "./market-costs-section";

const DEFAULT_RANGE_DAYS = 30;
const PAGE_SIZE = 25;

export default async function MarketCostsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    page?: string;
    search?: string;
  }>;
}) {
  const {
    from: fromParam,
    to: toParam,
    page: pageParam,
    search: searchParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = searchParam?.trim() || undefined;

  // Local calendar date (matching toDateInputValue's own convention below),
  // not a bare UTC-midnight snap — those two disagree for up to a day
  // depending on server timezone (e.g. UTC+8 machines cross into "tomorrow"
  // locally 8 hours before UTC does), which silently excluded today's own
  // freshly-added rows from the default range below.
  const today = new Date(toDateInputValue(new Date()));
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - (DEFAULT_RANGE_DAYS - 1));

  const fromDate = fromParam ? new Date(fromParam) : defaultFrom;
  const toDate = toParam ? new Date(toParam) : today;
  // `lt` the day after `to` so the whole `to` day (stored at UTC midnight) is included.
  const toDateExclusive = new Date(toDate);
  toDateExclusive.setUTCDate(toDateExclusive.getUTCDate() + 1);

  const where = {
    date: { gte: fromDate, lt: toDateExclusive },
    ...(search
      ? { description: { contains: search, mode: "insensitive" as const } }
      : {}),
  };

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

      <form suppressHydrationWarning className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Search
          </label>
          <input suppressHydrationWarning
            name="search"
            type="text"
            placeholder="Description"
            defaultValue={search ?? ""}
            className="mt-1 rounded-md border border-brand-tan px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            From
          </label>
          <input suppressHydrationWarning
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
          <input suppressHydrationWarning
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

      <MarketCostsSection
        action={upsertMarketCost}
        defaultDate={toDateInputValue(new Date())}
        groups={groups.map((group) => ({
          ...group,
          items: group.items.map((cost) => ({
            id: cost.id,
            description: cost.description,
            quantity: cost.quantity,
            amount: cost.amount.toString(),
            date: utcDateKey(cost.date),
          })),
        }))}
        deleteAction={deleteMarketCost}
        bulkDeleteAction={deleteMarketCosts}
        totalLabel={`Total (${formatRangeDate(fromDate)} – ${formatRangeDate(toDate)})`}
        total={total}
        emptyMessage={
          search
            ? "No market costs match this search."
            : "No market costs logged in this period."
        }
        pagination={
          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => {
              const params = new URLSearchParams({
                from: utcDateKey(fromDate),
                to: utcDateKey(toDate),
                page: String(p),
              });
              if (search) params.set("search", search);
              return `/market-costs?${params.toString()}`;
            }}
          />
        }
      />
    </div>
  );
}
