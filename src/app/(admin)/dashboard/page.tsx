import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, toNumber } from "@/lib/money";
import { utcDateKey, formatRangeDate } from "@/lib/date";
import { IncomeChart } from "./income-chart";
import { SubmitButton } from "@/components/submit-button";
import { StatCard } from "@/components/stat-card";

const DEFAULT_RANGE_DAYS = 30;
const MAX_CHART_DAYS = 366;

export default async function DashboardPage({
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

  const [sales, costs, expenses, topItemGroups, unpaidRows, pendingRows] =
    await Promise.all([
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
      // All-time, deliberately not date-scoped — "unpaid" is a current-state
      // flag, not a period metric. An order from weeks ago is still owed
      // today regardless of what range is selected above.
      prisma.order.findMany({
        where: { paymentStatus: "Unpaid" },
        select: { id: true, orderGroupId: true, quantity: true, unitPrice: true },
      }),
      prisma.order.findMany({
        where: { deliveryStatus: "Pending" },
        select: { id: true, orderGroupId: true },
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
  const netIncome = totalSales - totalCosts - totalExpenses;

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
      net: daySales - dayCosts - dayExpenses,
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
          href="/dashboard"
          className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
        >
          Reset
        </Link>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total sales" value={formatMoney(totalSales)} />
        <StatCard label="Total market costs" value={formatMoney(totalCosts)} />
        <StatCard label="Total expenses" value={formatMoney(totalExpenses)} />
        <StatCard
          label="Net income"
          value={formatMoney(netIncome)}
          subtitle="Sales − market costs − expenses"
          tone={netIncome >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-medium text-brand-brown">
            {formatRangeDate(fromDate)} – {formatRangeDate(toDate)}
          </h2>
          <div className="mt-4 h-72">
            <IncomeChart data={chartData} />
          </div>
        </section>

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
                <li key={item.id} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-cream text-xs font-semibold text-brand-brown">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-brand-brown">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="font-medium text-brand-brown">
                      {formatMoney(item.revenue)}
                    </span>
                    <span className="ml-1.5 text-xs text-brand-brown-light">
                      {item.quantity} sold
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
