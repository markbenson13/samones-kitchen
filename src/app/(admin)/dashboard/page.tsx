import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney, toNumber } from "@/lib/money";
import { toDateInputValue, utcDateKey, formatRangeDate } from "@/lib/date";
import { IncomeChart } from "./income-chart";
import { SubmitButton } from "@/components/submit-button";
import { StatCard } from "@/components/stat-card";
import { FilterForm } from "@/components/filter-form";

const DEFAULT_RANGE_DAYS = 30;
const MAX_CHART_DAYS = 366;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; day?: string }>;
}) {
  const { from: fromParam, to: toParam, day: dayParam } = await searchParams;

  // Local calendar date (matching toDateInputValue's own convention below),
  // not a bare UTC-midnight snap — those two disagree for up to a day
  // depending on server timezone (e.g. UTC+8 machines cross into "tomorrow"
  // locally 8 hours before UTC does), which silently excluded today's own
  // freshly-added rows from every "today"-scoped default view below.
  const today = new Date(toDateInputValue(new Date()));
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - (DEFAULT_RANGE_DAYS - 1));

  const fromDate = fromParam ? new Date(fromParam) : defaultFrom;
  const toDate = toParam ? new Date(toParam) : today;
  // The "Right now" section has its own day filter, independent of the
  // range above — it defaults to today but can look back at any past day's
  // sales.
  const selectedDay = dayParam ? new Date(dayParam) : today;
  const isToday = utcDateKey(selectedDay) === utcDateKey(today);
  // `lt` the day after `to` so the whole `to` day (stored at UTC midnight) is included.
  const toDateExclusive = new Date(toDate);
  toDateExclusive.setUTCDate(toDateExclusive.getUTCDate() + 1);

  const dayCount = Math.min(
    MAX_CHART_DAYS,
    Math.max(
      1,
      Math.round(
        (toDateExclusive.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)
      )
    )
  );

  const dateRangeWhere = { date: { gte: fromDate, lt: toDateExclusive } };

  // Each query here is a separate round trip to the database, and in
  // practice that round-trip latency doesn't shrink by firing them
  // concurrently (measured: Promise.all isn't reliably faster than
  // sequential against this DB) — so the lever that actually matters is
  // cutting the *number* of queries, not just parallelizing them. Three
  // same-shape "amount per day in range" queries (Sale/MarketCost/Expense)
  // become one UNION ALL; the two all-time Order aggregates (unpaid,
  // pending) become one query using FILTER instead of two.
  const [
    dailyRows,
    topItemGroups,
    rangeOrders,
    [unpaidPendingAgg],
    selectedDaySales,
    selectedDayCosts,
    allFoodItems,
  ] = await Promise.all([
    // amount comes back as a Decimal instance (the pg driver adapter's
    // NUMERIC mapping), not a plain string — toNumber() below handles that,
    // but the type here reflects the real runtime shape so this doesn't
    // silently drift again.
    prisma.$queryRaw<
      {
        date: Date;
        amount: Prisma.Decimal;
        source: "sale" | "cost" | "expense" | "saving";
      }[]
    >`
      SELECT date, "totalAmount" AS amount, 'sale' AS source
      FROM "Sale"
      WHERE date >= ${fromDate} AND date < ${toDateExclusive}
      UNION ALL
      SELECT date, amount, 'cost' AS source
      FROM "MarketCost"
      WHERE date >= ${fromDate} AND date < ${toDateExclusive}
      UNION ALL
      SELECT date, amount, 'expense' AS source
      FROM "Expense"
      WHERE date >= ${fromDate} AND date < ${toDateExclusive}
      UNION ALL
      SELECT date, CASE WHEN type = 'Withdrawal' THEN -amount ELSE amount END AS amount, 'saving' AS source
      FROM "Saving"
      WHERE date >= ${fromDate} AND date < ${toDateExclusive}
    `,
    prisma.sale.groupBy({
      by: ["foodItemId"],
      where: dateRangeWhere,
      _sum: { totalAmount: true, quantity: true },
    }),
    // For "Top customers" below — fetched raw (not Prisma groupBy) so
    // batches (orderGroupId ?? id) can be deduped in JS; groupBy alone would
    // either collapse every legacy orderGroupId:null row into one group or
    // count each line item as its own "order". Unpaid/pending below don't
    // need this same row-level fetch — COALESCE(...) in SQL dedupes batches
    // directly, so only a count/sum comes back, not every matching row.
    prisma.order.findMany({
      where: dateRangeWhere,
      select: {
        customerName: true,
        orderGroupId: true,
        id: true,
        quantity: true,
        unitPrice: true,
      },
    }),
    // All-time, deliberately not date-scoped — "unpaid"/"pending" are
    // current-state flags, not period metrics. An order from weeks ago is
    // still owed today regardless of what range is selected above. A batch
    // is orderGroupId ?? id (older rows have no orderGroupId, so are their
    // own singleton batch) — COALESCE handles that the same way the JS
    // `orderGroupId ?? id` dedup elsewhere in this file does. FILTER scopes
    // each aggregate to its own condition within a single table scan,
    // instead of running the unpaid and pending ("not yet delivered" —
    // covers both Pending and the in-between "For dispatch" status) scans
    // as two separate queries.
    prisma.$queryRaw<
      { unpaid_count: number; unpaid_total: Prisma.Decimal | null; pending_count: number }[]
    >`
      SELECT
        COUNT(DISTINCT COALESCE("orderGroupId", id)) FILTER (WHERE "paymentStatus" = 'Unpaid')::int AS unpaid_count,
        COALESCE(SUM(quantity * "unitPrice") FILTER (WHERE "paymentStatus" = 'Unpaid'), 0) AS unpaid_total,
        COUNT(DISTINCT COALESCE("orderGroupId", id)) FILTER (WHERE "deliveryStatus" != 'Delivered')::int AS pending_count
      FROM "Order"
    `,
    // Scoped to selectedDay (its own filter, defaulting to today), not the
    // from/to range above — deliberately independent, same reasoning as
    // unpaid/pending: this is a single day's snapshot, not a period metric.
    prisma.sale.aggregate({
      where: { date: selectedDay },
      _sum: { totalAmount: true, quantity: true },
    }),
    prisma.marketCost.aggregate({
      where: { date: selectedDay },
      _sum: { amount: true },
    }),
    // Fetched in full (the table's tiny) so the Top 10 food items' names
    // below don't need a second, dependent round trip after this batch.
    prisma.foodItem.findMany({ select: { id: true, name: true } }),
  ]);

  let totalSales = 0;
  let totalCosts = 0;
  let totalExpenses = 0;
  let totalSavings = 0;
  const salesByDay = new Map<string, number>();
  const costsByDay = new Map<string, number>();
  const expensesByDay = new Map<string, number>();
  for (const row of dailyRows) {
    const amount = toNumber(row.amount);
    const key = utcDateKey(row.date);
    if (row.source === "sale") {
      totalSales += amount;
      salesByDay.set(key, (salesByDay.get(key) ?? 0) + amount);
    } else if (row.source === "cost") {
      totalCosts += amount;
      costsByDay.set(key, (costsByDay.get(key) ?? 0) + amount);
    } else if (row.source === "expense") {
      totalExpenses += amount;
      expensesByDay.set(key, (expensesByDay.get(key) ?? 0) + amount);
    } else {
      totalSavings += amount;
    }
  }
  // Deliberately excludes expenses — net income here is the food business's
  // own margin (sales minus cost of goods), not the fuller post-overhead
  // figure. That one is "Available income" below, same definition as the
  // Expenses page's card of the same name.
  const netIncome = totalSales - totalCosts;
  // Savings are still cash that left the operating till (same reasoning as
  // Withdrawal/Personal Use expenses), so this keeps meaning "what's left
  // for buying ingredients, gas, etc." — see the Expenses page's card of
  // the same name.
  const availableIncome = totalSales - totalCosts - totalExpenses - totalSavings;

  const unpaidCount = unpaidPendingAgg.unpaid_count;
  const unpaidTotal = toNumber(unpaidPendingAgg.unpaid_total ?? "0");
  const pendingCount = unpaidPendingAgg.pending_count;

  const selectedDaySalesTotal = toNumber(
    selectedDaySales._sum.totalAmount?.toString() ?? "0"
  );
  const selectedDaySalesQuantity = selectedDaySales._sum.quantity ?? 0;
  const selectedDayCostsTotal = toNumber(
    selectedDayCosts._sum.amount?.toString() ?? "0"
  );
  // Same definition as the range's "Net income" card above — sales minus
  // market costs, deliberately excluding expenses.
  const selectedDayNetIncome = selectedDaySalesTotal - selectedDayCostsTotal;

  const topTenGroups = [...topItemGroups]
    .sort(
      (a, b) =>
        toNumber(b._sum.totalAmount?.toString() ?? "0") -
        toNumber(a._sum.totalAmount?.toString() ?? "0")
    )
    .slice(0, 10);
  const nameById = new Map(allFoodItems.map((f) => [f.id, f.name]));
  const topTen = topTenGroups.map((group) => ({
    id: group.foodItemId,
    name: nameById.get(group.foodItemId) ?? "Unknown item",
    revenue: toNumber(group._sum.totalAmount?.toString() ?? "0"),
    quantity: group._sum.quantity ?? 0,
  }));

  // Pre-dates the tower+building customer code — a bare "A-1234" was
  // recorded back when the code was just the building's first letter, and
  // was genuinely ambiguous between Amina and Astra (both start with "A").
  // For this ranking specifically, treat every one as Amina/Allegra ("AA-"),
  // so it merges into that bucket instead of sitting in its own orphaned
  // "A-" one that no current order ever produces.
  function normalizeForRanking(customerName: string): string {
    return customerName.startsWith("A-") ? `AA-${customerName.slice(2)}` : customerName;
  }

  // Batches (orderGroupId ?? id), not raw line items — a customer who
  // ordered 3 dishes in one order placed once, not three times.
  const customerStats = new Map<
    string,
    { batchKeys: Set<string>; totalSpend: number }
  >();
  for (const order of rangeOrders) {
    const customerName = normalizeForRanking(order.customerName);
    const stat = customerStats.get(customerName) ?? {
      batchKeys: new Set<string>(),
      totalSpend: 0,
    };
    stat.batchKeys.add(order.orderGroupId ?? order.id);
    stat.totalSpend += order.quantity * toNumber(order.unitPrice.toString());
    customerStats.set(customerName, stat);
  }
  const topCustomers = Array.from(customerStats.entries())
    .map(([customerName, stat]) => ({
      customerName,
      orderCount: stat.batchKeys.size,
      totalSpend: stat.totalSpend,
    }))
    .sort(
      (a, b) => b.orderCount - a.orderCount || b.totalSpend - a.totalSpend
    )
    .slice(0, 10);

  const chartData = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(fromDate);
    d.setUTCDate(d.getUTCDate() + i);
    const key = utcDateKey(d);
    const daySales = salesByDay.get(key) ?? 0;
    const dayCosts = costsByDay.get(key) ?? 0;
    const dayExpenses = expensesByDay.get(key) ?? 0;
    return {
      date: key.slice(5),
      sales: daySales,
      costs: dayCosts,
      expenses: dayExpenses,
      net: daySales - dayCosts,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-brown">Dashboard</h1>
        <p className="mt-1 text-sm text-brand-brown-light">
          Totals and daily breakdown for the selected range.
        </p>
      </div>

      <FilterForm suppressHydrationWarning className="flex flex-wrap items-end gap-3">
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
          href="/dashboard"
          className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
        >
          Reset
        </Link>
        {/* Preserves the "Right now" section's own day filter (below) when
            this range filter is applied — the two are independent. */}
        <input suppressHydrationWarning type="hidden" name="day" value={dayParam ?? ""} />
      </FilterForm>

      <div>
        <h2 className="text-sm font-medium text-brand-brown">
          {formatRangeDate(fromDate)} – {formatRangeDate(toDate)}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total sales" value={formatMoney(totalSales)} />
          <StatCard label="Total market costs" value={formatMoney(totalCosts)} />
          <StatCard label="Total expenses" value={formatMoney(totalExpenses)} />
          <StatCard
            label="Savings"
            value={formatMoney(totalSavings)}
            subtitle="See the Savings page"
          />
          <StatCard
            label="Net income"
            value={formatMoney(netIncome)}
            subtitle="Sales − market costs"
            tone={netIncome >= 0 ? "positive" : "negative"}
          />
          <StatCard
            label="Available income"
            value={formatMoney(availableIncome)}
            subtitle="Sales − market costs − expenses − savings"
            tone={availableIncome >= 0 ? "positive" : "negative"}
          />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-brand-brown">
              {isToday ? "Right now" : `Sales for ${formatRangeDate(selectedDay)}`}
            </h2>
            <p className="mt-1 text-xs text-brand-brown-light">
              Unpaid orders and pending deliveries are always all-time.
              Sales and net income below are for the day picked here — not
              the range filter above.
            </p>
          </div>
          <FilterForm suppressHydrationWarning className="flex flex-wrap items-end gap-3">
            <input suppressHydrationWarning type="hidden" name="from" value={fromParam ?? ""} />
            <input suppressHydrationWarning type="hidden" name="to" value={toParam ?? ""} />
            <div>
              <label className="block text-xs font-medium text-brand-brown-light">
                Day
              </label>
              <input suppressHydrationWarning
                name="day"
                type="date"
                defaultValue={utcDateKey(selectedDay)}
                className="mt-1 rounded-md border border-brand-tan px-3 py-2 text-sm"
              />
            </div>
            <SubmitButton
              pendingText="Applying…"
              className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
            >
              Apply
            </SubmitButton>
            {!isToday && (
              <Link
                href={(() => {
                  const params = new URLSearchParams();
                  if (fromParam) params.set("from", fromParam);
                  if (toParam) params.set("to", toParam);
                  const qs = params.toString();
                  return qs ? `/dashboard?${qs}` : "/dashboard";
                })()}
                className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
              >
                Today
              </Link>
            )}
          </FilterForm>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link href={`/sales?date=${utcDateKey(selectedDay)}`} className="block">
            <StatCard
              label={isToday ? "Today's sales" : "Sales"}
              value={formatMoney(selectedDaySalesTotal)}
              subtitle={
                isToday
                  ? `${selectedDaySalesQuantity} sold · today`
                  : `${selectedDaySalesQuantity} sold · ${formatRangeDate(selectedDay)}`
              }
              tone="neutral"
            />
          </Link>
          <StatCard
            label={isToday ? "Today's net income" : "Net income"}
            value={formatMoney(selectedDayNetIncome)}
            subtitle="Sales − market costs"
            tone={selectedDayNetIncome >= 0 ? "positive" : "negative"}
          />
          <Link href="/orders?payment=Unpaid" className="block">
            <StatCard
              label="Unpaid orders"
              value={`${unpaidCount} order${unpaidCount === 1 ? "" : "s"}`}
              subtitle={`${formatMoney(unpaidTotal)} owed · all-time`}
              tone={unpaidCount > 0 ? "negative" : "neutral"}
            />
          </Link>
          <Link href="/orders?delivery=Pending" className="block">
            <StatCard
              label="Pending deliveries"
              value={`${pendingCount} order${pendingCount === 1 ? "" : "s"}`}
              subtitle="All-time"
              tone="neutral"
            />
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-brand-brown">
          {formatRangeDate(fromDate)} – {formatRangeDate(toDate)}
        </h2>
        <div className="mt-4 h-80">
          <IncomeChart data={chartData} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-brand-brown">
            Top 10 food items
          </h2>
          <p className="mt-1 text-xs text-brand-brown-light">By revenue, this range.</p>
          {topTen.length === 0 ? (
            <p className="mt-4 text-sm text-brand-brown-light">No sales yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {topTen.map((item, i) => (
                <li key={item.id} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-cream text-xs font-semibold text-brand-brown">
                    {i + 1}
                  </span>
                  {/* Stacked below sm (mobile) so the name always gets a
                      full line to itself — sharing one squeezed it down to
                      whatever the price block didn't need, which truncated
                      hard (or, before a min-w floor, could shrink to 0
                      width and vanish) when this card was narrow. Side by
                      side from sm up, where there's reliably enough room
                      (this card is never narrower than half the page past
                      that point), to cut the row's height. */}
                  <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <p className="min-w-16 truncate text-sm text-brand-brown">
                      {item.name}
                    </p>
                    <p className="shrink-0 text-xs text-brand-brown-light">
                      <span className="font-medium text-brand-brown">
                        {formatMoney(item.revenue)}
                      </span>
                      <span className="ml-1.5">{item.quantity} sold</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-brand-brown">
            Top customers
          </h2>
          <p className="mt-1 text-xs text-brand-brown-light">
            By number of orders, this range.
          </p>
          {topCustomers.length === 0 ? (
            <p className="mt-4 text-sm text-brand-brown-light">
              No orders yet.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {topCustomers.map((customer, i) => (
                <li
                  key={customer.customerName}
                  className="flex items-start gap-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-cream text-xs font-semibold text-brand-brown">
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <p className="min-w-16 truncate text-sm text-brand-brown">
                      {customer.customerName}
                    </p>
                    <p className="shrink-0 text-xs text-brand-brown-light">
                      <span className="font-medium text-brand-brown">
                        {customer.orderCount} order
                        {customer.orderCount === 1 ? "" : "s"}
                      </span>
                      <span className="ml-1.5">
                        {formatMoney(customer.totalSpend)} spent
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
