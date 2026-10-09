import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney, toNumber } from "@/lib/money";
import {
  toDateInputValue,
  utcDateKey,
  formatGroupDate,
  formatRangeDate,
} from "@/lib/date";
import { EXPENSE_CATEGORIES, OWNER_DRAW_CATEGORIES } from "@/lib/expense-categories";
import {
  upsertExpense,
  deleteExpense,
  deleteExpenses,
  bulkUpdateExpenseCategory,
} from "@/app/actions/expenses";
import { SubmitButton } from "@/components/submit-button";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { FilterForm } from "@/components/filter-form";
import { ExpensesSection } from "./expenses-section";

const DEFAULT_RANGE_DAYS = 30;
const PAGE_SIZE = 25;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    page?: string;
    search?: string;
    category?: string;
  }>;
}) {
  const {
    from: fromParam,
    to: toParam,
    page: pageParam,
    search: searchParam,
    category: categoryParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = searchParam?.trim() || undefined;
  const category =
    categoryParam && categoryParam !== "All" ? categoryParam : undefined;

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

  // Shared by the Sales/Market costs context stat cards below, which are
  // date-scoped only — they're not searchable, so they can't take the
  // description filter the Expense queries below need.
  const dateRangeWhere = { date: { gte: fromDate, lt: toDateExclusive } };
  const where = {
    ...dateRangeWhere,
    ...(search
      ? { description: { contains: search, mode: "insensitive" as const } }
      : {}),
    ...(category ? { category } : {}),
  };

  const [expenses, expensesAgg, [categorySplitAgg], [salesCostsAgg]] =
    await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      // _count and _sum together in one call instead of a separate count() +
      // aggregate() round trip — same data, half the queries. This drives
      // pagination and the table's own footer total, so it respects every
      // filter above (date range, search, category) the same as the listed
      // rows do.
      prisma.expense.aggregate({ where, _count: true, _sum: { amount: true } }),
      // Total of every category, plus the Withdrawal/Personal Use subset
      // broken out for the "Owner withdrawals" card below — deliberately
      // scoped to date range + search only, NOT the category filter, so
      // picking one category from the dropdown doesn't change what these
      // headline figures mean.
      prisma.$queryRaw<{ total: Prisma.Decimal; owner_draw_total: Prisma.Decimal }[]>`
      SELECT
        COALESCE(SUM(amount), 0) AS total,
        COALESCE(SUM(amount) FILTER (WHERE category IN (${Prisma.join(OWNER_DRAW_CATEGORIES)})), 0) AS owner_draw_total
      FROM "Expense"
      WHERE date >= ${fromDate} AND date < ${toDateExclusive}
      ${search ? Prisma.sql`AND description ILIKE ${`%${search}%`}` : Prisma.empty}
    `,
      // Sale, MarketCost, and Saving are different tables, so Prisma's query
      // builder can't aggregate all three in one call — a raw query with
      // scalar subqueries covers them in a single round trip instead of
      // three. Comes back as Decimal instances (the pg driver adapter's
      // NUMERIC mapping), not plain strings — toNumber() handles that.
      prisma.$queryRaw<
        {
          sales_total: Prisma.Decimal;
          costs_total: Prisma.Decimal;
          savings_total: Prisma.Decimal;
        }[]
      >`
      SELECT
        (SELECT COALESCE(SUM("totalAmount"), 0) FROM "Sale" WHERE date >= ${fromDate} AND date < ${toDateExclusive}) AS sales_total,
        (SELECT COALESCE(SUM(amount), 0) FROM "MarketCost" WHERE date >= ${fromDate} AND date < ${toDateExclusive}) AS costs_total,
        (SELECT COALESCE(SUM(amount), 0) FROM "Saving" WHERE date >= ${fromDate} AND date < ${toDateExclusive}) AS savings_total
    `,
    ]);

  const totalCount = expensesAgg._count;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const listedTotal = toNumber(expensesAgg._sum.amount?.toString() ?? "0");
  const totalExpenses = toNumber(categorySplitAgg.total);
  const ownerDrawTotal = toNumber(categorySplitAgg.owner_draw_total);
  const totalSales = toNumber(salesCostsAgg.sales_total);
  const totalMarketCosts = toNumber(salesCostsAgg.costs_total);
  const totalSavings = toNumber(salesCostsAgg.savings_total);
  // Savings are still cash that left the operating till (same reasoning as
  // Withdrawal/Personal Use expenses) — subtracted here so this keeps
  // meaning "what's left for buying ingredients, gas, etc.", even though
  // the Savings page tracks that money separately from spending.
  const availableIncome = totalSales - totalMarketCosts - totalExpenses - totalSavings;

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard label="Total sales" value={formatMoney(totalSales)} />
        <StatCard
          label="Total market costs"
          value={formatMoney(totalMarketCosts)}
        />
        <StatCard label="Total expenses" value={formatMoney(totalExpenses)} />
        <StatCard
          label="Owner withdrawals"
          value={formatMoney(ownerDrawTotal)}
          subtitle="Withdrawal + Personal Use — included in total expenses"
        />
        <StatCard
          label="Savings"
          value={formatMoney(totalSavings)}
          subtitle="This period — see the Savings page"
        />
        <StatCard
          label="Available income"
          value={formatMoney(availableIncome)}
          subtitle="Sales − market costs − expenses − savings"
          tone={availableIncome >= 0 ? "positive" : "negative"}
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
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Category
          </label>
          <select suppressHydrationWarning
            name="category"
            defaultValue={category ?? "All"}
            className="mt-1 rounded-md border border-brand-tan px-3 py-2 text-sm"
          >
            <option value="All">All</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
      </FilterForm>

      <ExpensesSection
        action={upsertExpense}
        defaultDate={toDateInputValue(new Date())}
        groups={groups.map((group) => ({
          ...group,
          items: group.items.map((expense) => ({
            id: expense.id,
            description: expense.description,
            amount: expense.amount.toString(),
            category: expense.category,
            date: utcDateKey(expense.date),
          })),
        }))}
        deleteAction={deleteExpense}
        bulkDeleteAction={deleteExpenses}
        bulkCategoryAction={bulkUpdateExpenseCategory}
        totalLabel={`Total (${formatRangeDate(fromDate)} – ${formatRangeDate(toDate)})`}
        total={listedTotal}
        emptyMessage={
          search || category
            ? "No expenses match these filters."
            : "No expenses logged in this period."
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
              if (category) params.set("category", category);
              return `/expenses?${params.toString()}`;
            }}
          />
        }
      />
    </div>
  );
}
