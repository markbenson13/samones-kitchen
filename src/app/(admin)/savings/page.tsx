import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, toNumber } from "@/lib/money";
import {
  toDateInputValue,
  utcDateKey,
  formatGroupDate,
  formatRangeDate,
} from "@/lib/date";
import {
  upsertSaving,
  deleteSaving,
  deleteSavings,
} from "@/app/actions/savings";
import { SubmitButton } from "@/components/submit-button";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { FilterForm } from "@/components/filter-form";
import { SavingsSection } from "./savings-section";

const DEFAULT_RANGE_DAYS = 30;
const PAGE_SIZE = 25;

export default async function SavingsPage({
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

  const [savings, totalAgg, allTimeAgg] = await Promise.all([
    prisma.saving.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    // _count and _sum together in one call instead of a separate count() +
    // aggregate() round trip — same data, half the queries. Drives
    // pagination and the table's own (filtered) footer total.
    prisma.saving.aggregate({ where, _count: true, _sum: { amount: true } }),
    // All-time, deliberately not scoped to the range/search filters above —
    // "Total saved" is a running balance, not a period metric (same
    // reasoning as Dashboard's unpaid/pending orders figures).
    prisma.saving.aggregate({ _sum: { amount: true } }),
  ]);

  const totalCount = totalAgg._count;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const total = toNumber(totalAgg._sum.amount?.toString() ?? "0");
  const totalSaved = toNumber(allTimeAgg._sum.amount?.toString() ?? "0");

  const groups: {
    key: string;
    label: string;
    items: typeof savings;
    subtotal: number;
  }[] = [];
  for (const saving of savings) {
    const key = utcDateKey(saving.date);
    const amount = toNumber(saving.amount.toString());
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.key === key) {
      currentGroup.items.push(saving);
      currentGroup.subtotal += amount;
    } else {
      groups.push({
        key,
        label: formatGroupDate(saving.date),
        items: [saving],
        subtotal: amount,
      });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-brown">Savings</h1>
        <p className="mt-1 text-sm text-brand-brown-light">
          Money set aside out of the business — still counted as leaving the
          operating till (see Available income on Expenses/Dashboard), but
          tracked separately from money actually spent.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Total saved"
          value={formatMoney(totalSaved)}
          subtitle="All time"
        />
      </div>

      <FilterForm suppressHydrationWarning className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Search
          </label>
          <input suppressHydrationWarning
            name="search"
            type="text"
            placeholder="Note"
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
          href="/savings"
          className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
        >
          Reset
        </Link>
      </FilterForm>

      <SavingsSection
        action={upsertSaving}
        defaultDate={toDateInputValue(new Date())}
        groups={groups.map((group) => ({
          ...group,
          items: group.items.map((saving) => ({
            id: saving.id,
            description: saving.description,
            amount: saving.amount.toString(),
            date: utcDateKey(saving.date),
          })),
        }))}
        deleteAction={deleteSaving}
        bulkDeleteAction={deleteSavings}
        totalLabel={`Total (${formatRangeDate(fromDate)} – ${formatRangeDate(toDate)})`}
        total={total}
        emptyMessage={
          search
            ? "No savings entries match this search."
            : "No savings logged in this period."
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
              return `/savings?${params.toString()}`;
            }}
          />
        }
      />
    </div>
  );
}
