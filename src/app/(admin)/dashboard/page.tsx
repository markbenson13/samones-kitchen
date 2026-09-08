import Link from "next/link";
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

  const [
    sales,
    costs,
    expenses,
    topItemGroups,
    rangeOrders,
    unpaidRows,
    pendingRows,
    selectedDaySales,
    selectedDayCosts,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: dateRangeWhere,
      select: { date: true, totalAmount: true },
    }),
    prisma.marketCost.findMany({
      where: dateRangeWhere,
      select: { date: true, amount: true },
    }),
    prisma.expense.findMany({
      where: dateRangeWhere,
      select: { date: true, amount: true },
    }),
    prisma.sale.groupBy({
      by: ["foodItemId"],
      where: dateRangeWhere,
      _sum: { totalAmount: true, quantity: true },
    }),
    // For "Top customers" below — fetched raw (not Prisma groupBy) so
    // batches (orderGroupId ?? id) can be deduped in JS the same way
    // unpaidCount/pendingCount already do; groupBy alone would either
    // collapse every legacy orderGroupId:null row into one group or count
    // each line item as its own "order".
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
    // All-time, deliberately not date-scoped — "unpaid" is a current-state
    // flag, not a period metric. An order from weeks ago is still owed
    // today regardless of what range is selected above.
    prisma.order.findMany({
      where: { paymentStatus: "Unpaid" },
      select: { id: true, orderGroupId: true, quantity: true, unitPrice: true },
    }),
    // "Not yet delivered" — covers both Pending and the in-between "For
    // dispatch" status, so an order doesn't just disappear from this count
    // the moment it's sent out but hasn't arrived yet.
    prisma.order.findMany({
      where: { deliveryStatus: { not: "Delivered" } },
      select: { id: true, orderGroupId: true },
    }),
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
  ]);

  const totalSales = sales.reduce(
    (sum, sale) => sum + toNumber(sale.totalAmount.toString()),
    0
  );
  const totalCosts = costs.reduce(
    (sum, cost) => sum + toNumber(cost.amount.toString()),
    0
  );
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + toNumber(expense.amount.toString()),
    0
  );
  // Deliberately excludes expenses — net income here is the food business's
  // own margin (sales minus cost of goods), not the fuller post-overhead
  // figure. That one lives on the Expenses page as "Available income".
  const netIncome = totalSales - totalCosts;

  // Batches (orderGroupId ?? id) are deduped in JS, not via Prisma groupBy —
  // groupBy would collapse every legacy orderGroupId:null row into one
  // group, undercounting. The ₱ total sums every matching row (a money
  // total, not a batch metric), so it isn't deduped.
  const unpaidBatchKeys = new Set(unpaidRows.map((r) => r.orderGroupId ?? r.id));
  const unpaidCount = unpaidBatchKeys.size;
  const unpaidTotal = unpaidRows.reduce(
    (sum, r) => sum + r.quantity * toNumber(r.unitPrice.toString()),
    0
  );
  const pendingCount = new Set(pendingRows.map((r) => r.orderGroupId ?? r.id))
    .size;

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
  const topTenFoodItems = await prisma.foodItem.findMany({
    where: { id: { in: topTenGroups.map((g) => g.foodItemId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(topTenFoodItems.map((f) => [f.id, f.name]));
  const topTen = topTenGroups.map((group) => ({
    id: group.foodItemId,
    name: nameById.get(group.foodItemId) ?? "Unknown item",
    revenue: toNumber(group._sum.totalAmount?.toString() ?? "0"),
    quantity: group._sum.quantity ?? 0,
  }));

  // Batches (orderGroupId ?? id), not raw line items — a customer who
  // ordered 3 dishes in one order placed once, not three times.
  const customerStats = new Map<
    string,
    { batchKeys: Set<string>; totalSpend: number }
  >();
  for (const order of rangeOrders) {
    const stat = customerStats.get(order.customerName) ?? {
      batchKeys: new Set<string>(),
      totalSpend: 0,
    };
    stat.batchKeys.add(order.orderGroupId ?? order.id);
    stat.totalSpend += order.quantity * toNumber(order.unitPrice.toString());
    customerStats.set(order.customerName, stat);
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

  const salesByDay = new Map<string, number>();
  for (const sale of sales) {
    const key = utcDateKey(sale.date);
    salesByDay.set(
      key,
      (salesByDay.get(key) ?? 0) + toNumber(sale.totalAmount.toString())
    );
  }

  const costsByDay = new Map<string, number>();
  for (const cost of costs) {
    const key = utcDateKey(cost.date);
    costsByDay.set(
      key,
      (costsByDay.get(key) ?? 0) + toNumber(cost.amount.toString())
    );
  }

  const expensesByDay = new Map<string, number>();
  for (const expense of expenses) {
    const key = utcDateKey(expense.date);
    expensesByDay.set(
      key,
      (expensesByDay.get(key) ?? 0) + toNumber(expense.amount.toString())
    );
  }

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
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total sales" value={formatMoney(totalSales)} />
          <StatCard label="Total market costs" value={formatMoney(totalCosts)} />
          <StatCard label="Total expenses" value={formatMoney(totalExpenses)} />
          <StatCard
            label="Net income"
            value={formatMoney(netIncome)}
            subtitle="Sales − market costs"
            tone={netIncome >= 0 ? "positive" : "negative"}
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
        <div className="mt-4 h-72">
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
