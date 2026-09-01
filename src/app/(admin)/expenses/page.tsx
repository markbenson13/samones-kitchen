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
  createExpense,
  deleteExpense,
  deleteExpenses,
} from "@/app/actions/expenses";
import { SubmitButton } from "@/components/submit-button";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { ExpensesTable } from "./expenses-table";

const DEFAULT_RANGE_DAYS = 30;
const PAGE_SIZE = 25;

export default async function ExpensesPage({
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

  const [expenses, totalCount, expensesAgg, salesAgg, marketCostsAgg] =
    await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
      prisma.sale.aggregate({ where, _sum: { totalAmount: true } }),
      prisma.marketCost.aggregate({ where, _sum: { amount: true } }),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const totalExpenses = toNumber(expensesAgg._sum.amount?.toString() ?? "0");
  const totalSales = toNumber(salesAgg._sum.totalAmount?.toString() ?? "0");
  const totalMarketCosts = toNumber(
    marketCostsAgg._sum.amount?.toString() ?? "0"
  );
  const availableIncome = totalSales - totalMarketCosts - totalExpenses;

  const groups: {
    key: string;
    label: string;
    items: typeof expenses;
    subtotal: number;
  }[] = [];
  for (const expense of expenses) {
    const key = utcDateKey(expense.date);
    const amount = toNumber(expense.amount.toString());
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.key === key) {
      currentGroup.items.push(expense);
      currentGroup.subtotal += amount;
    } else {
      groups.push({
        key,
        label: formatGroupDate(expense.date),
        items: [expense],
        subtotal: amount,
      });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-brown">Expenses</h1>
        <p className="mt-1 text-sm text-brand-brown-light">
          Operating expenses — gas, packaging, transportation, and other
          costs beyond market/ingredient costs.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total sales" value={formatMoney(totalSales)} />
        <StatCard
          label="Total market costs"
          value={formatMoney(totalMarketCosts)}
        />
        <StatCard label="Total expenses" value={formatMoney(totalExpenses)} />
        <StatCard
          label="Available income"
          value={formatMoney(availableIncome)}
          subtitle="Sales − market costs − expenses"
          tone={availableIncome >= 0 ? "positive" : "negative"}
        />
      </div>

      <form suppressHydrationWarning className="flex flex-wrap items-end gap-3">
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
          href="/expenses"
          className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
        >
          Reset
        </Link>
      </form>

      <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-brand-brown">Add expense</h2>
        <form suppressHydrationWarning
          action={createExpense}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-brand-brown-light">
              Description
            </label>
            <input suppressHydrationWarning
              name="description"
              type="text"
              required
              placeholder="e.g. Gas, packaging, delivery fare"
              className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-brown-light">
              Amount
            </label>
            <input suppressHydrationWarning
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
            <input suppressHydrationWarning
              name="date"
              type="date"
              defaultValue={toDateInputValue(new Date())}
              className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end lg:col-span-4">
            <SubmitButton
              pendingText="Adding…"
              className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
            >
              Add expense
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        {groups.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brand-brown-light">
            No expenses logged in this period.
          </p>
        ) : (
          <ExpensesTable
            groups={groups.map((group) => ({
              ...group,
              items: group.items.map((expense) => ({
                id: expense.id,
                description: expense.description,
                amount: expense.amount.toString(),
              })),
            }))}
            deleteAction={deleteExpense}
            bulkDeleteAction={deleteExpenses}
            totalLabel={`Total (${formatRangeDate(fromDate)} – ${formatRangeDate(toDate)})`}
            total={totalExpenses}
          />
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) =>
            `/expenses?from=${utcDateKey(fromDate)}&to=${utcDateKey(toDate)}&page=${p}`
          }
        />
      </section>
    </div>
  );
}
