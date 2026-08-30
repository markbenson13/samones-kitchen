import { prisma } from "@/lib/prisma";
import { formatMoney, toNumber } from "@/lib/money";
import { IncomeChart } from "./income-chart";

const CHART_DAYS = 14;

// Sale/MarketCost `date` values are date-only inputs, stored as UTC midnight
// (`new Date("YYYY-MM-DD")` parses as UTC). Bucketing must stay in UTC too,
// or day boundaries drift by one for any server timezone ahead of UTC.
function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const rangeStart = new Date();
  rangeStart.setUTCDate(rangeStart.getUTCDate() - (CHART_DAYS - 1));
  rangeStart.setUTCHours(0, 0, 0, 0);

  const [salesAgg, costsAgg, recentSales, recentCosts] = await Promise.all([
    prisma.sale.aggregate({ _sum: { totalAmount: true } }),
    prisma.marketCost.aggregate({ _sum: { amount: true } }),
    prisma.sale.findMany({
      where: { date: { gte: rangeStart } },
      select: { date: true, totalAmount: true },
    }),
    prisma.marketCost.findMany({
      where: { date: { gte: rangeStart } },
      select: { date: true, amount: true },
    }),
  ]);

  const totalSales = toNumber(salesAgg._sum.totalAmount?.toString() ?? "0");
  const totalCosts = toNumber(costsAgg._sum.amount?.toString() ?? "0");
  const netIncome = totalSales - totalCosts;

  const salesByDay = new Map<string, number>();
  for (const sale of recentSales) {
    const key = dateKey(sale.date);
    salesByDay.set(
      key,
      (salesByDay.get(key) ?? 0) + toNumber(sale.totalAmount.toString())
    );
  }

  const costsByDay = new Map<string, number>();
  for (const cost of recentCosts) {
    const key = dateKey(cost.date);
    costsByDay.set(
      key,
      (costsByDay.get(key) ?? 0) + toNumber(cost.amount.toString())
    );
  }

  const chartData = Array.from({ length: CHART_DAYS }, (_, i) => {
    const d = new Date(rangeStart);
    d.setUTCDate(d.getUTCDate() + i);
    const key = dateKey(d);
    const sales = salesByDay.get(key) ?? 0;
    const costs = costsByDay.get(key) ?? 0;
    return {
      date: key.slice(5),
      sales,
      costs,
      net: sales - costs,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          All-time totals and the last {CHART_DAYS} days of activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total sales" value={formatMoney(totalSales)} />
        <StatCard label="Total market costs" value={formatMoney(totalCosts)} />
        <StatCard
          label="Net income"
          value={formatMoney(netIncome)}
          tone={netIncome >= 0 ? "positive" : "negative"}
        />
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">
          Last {CHART_DAYS} days
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
        : "text-neutral-900";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase text-neutral-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
