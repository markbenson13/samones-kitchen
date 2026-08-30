import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, toNumber } from "@/lib/money";
import { IncomeChart } from "./income-chart";

const DEFAULT_RANGE_DAYS = 30;
const MAX_CHART_DAYS = 366;

// Sale/MarketCost `date` values are date-only inputs, stored as UTC midnight
// (`new Date("YYYY-MM-DD")` parses as UTC). Range math/bucketing must stay in
// UTC too, or day boundaries drift by one for any server timezone ahead of
// UTC.
function utcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatRangeDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

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

  const [sales, costs] = await Promise.all([
    prisma.sale.findMany({
      where: { date: { gte: fromDate, lt: toDateExclusive } },
      select: { date: true, totalAmount: true },
    }),
    prisma.marketCost.findMany({
      where: { date: { gte: fromDate, lt: toDateExclusive } },
      select: { date: true, amount: true },
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
  const netIncome = totalSales - totalCosts;

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

  const chartData = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(fromDate);
    d.setUTCDate(d.getUTCDate() + i);
    const key = utcDateKey(d);
    const daySales = salesByDay.get(key) ?? 0;
    const dayCosts = costsByDay.get(key) ?? 0;
    return {
      date: key.slice(5),
      sales: daySales,
      costs: dayCosts,
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
        <button
          type="submit"
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
        >
          Apply
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
        >
          Reset
        </Link>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total sales" value={formatMoney(totalSales)} />
        <StatCard label="Total market costs" value={formatMoney(totalCosts)} />
        <StatCard
          label="Net income"
          value={formatMoney(netIncome)}
          tone={netIncome >= 0 ? "positive" : "negative"}
        />
      </div>

      <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-brand-brown">
          {formatRangeDate(fromDate)} – {formatRangeDate(toDate)}
        </h2>
        <div className="mt-4 h-72">
          <IncomeChart data={chartData} />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-red-600"
        : "text-brand-brown";

  return (
    <div className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase text-brand-brown-light">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
