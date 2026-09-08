import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import {
  toDateInputValue,
  utcDateKey,
  formatGroupDate,
  formatRangeDate,
} from "@/lib/date";
import { getDailyMenuByDate } from "@/lib/daily-menu";
import { upsertSale, deleteSale, deleteSales } from "@/app/actions/sales";
import { SalesSection } from "./sales-section";
import { Pagination } from "@/components/pagination";
import { SubmitButton } from "@/components/submit-button";
import { FilterForm } from "@/components/filter-form";

const DEFAULT_RANGE_DAYS = 30;
const PAGE_SIZE = 25;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    from?: string;
    to?: string;
    search?: string;
    foodItemId?: string;
  }>;
}) {
  const {
    page: pageParam,
    from: fromParam,
    to: toParam,
    search: searchParam,
    foodItemId: foodItemIdParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = searchParam?.trim() || undefined;
  // The dropdown's own "All" option submits the literal string "All" (its
  // defaultValue) whenever the form is applied without changing it — that
  // must not become a real `{ foodItemId: "All" }` filter, or it silently
  // zeroes out every result whenever another field (date range, search) is
  // the only thing actually being filtered on.
  const foodItemIdFilter =
    foodItemIdParam && foodItemIdParam !== "All" ? foodItemIdParam : undefined;

  // Local calendar date (matching toDateInputValue's own convention below),
  // not a bare UTC-midnight snap — those two disagree for up to a day
  // depending on server timezone, same reasoning as Dashboard/Market Costs.
  const todayDate = new Date(toDateInputValue(new Date()));
  const defaultFrom = new Date(todayDate);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - (DEFAULT_RANGE_DAYS - 1));

  const fromDate = fromParam ? new Date(fromParam) : defaultFrom;
  const toDate = toParam ? new Date(toParam) : todayDate;
  // `lt` the day after `to` so the whole `to` day (stored at UTC midnight) is included.
  const toDateExclusive = new Date(toDate);
  toDateExclusive.setUTCDate(toDateExclusive.getUTCDate() + 1);

  const where = {
    date: { gte: fromDate, lt: toDateExclusive },
    ...(search
      ? { foodItem: { name: { contains: search, mode: "insensitive" as const } } }
      : {}),
    ...(foodItemIdFilter ? { foodItemId: foodItemIdFilter } : {}),
  };

  const [sales, salesCount, foodItems, filterableFoodItems, menuByDate] =
    await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: { date: "desc" },
        include: { foodItem: true },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.sale.count({ where }),
      prisma.foodItem.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      // Includes inactive/discontinued items too, unlike the Record-sale
      // form's dropdown above — filtering sales history should still be able
      // to find a discontinued item's past entries.
      prisma.foodItem.findMany({
        where: { sales: { some: {} } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      getDailyMenuByDate(),
    ]);

  const totalPages = Math.max(1, Math.ceil(salesCount / PAGE_SIZE));

  function computeLeftoverAndTotal(sale: (typeof sales)[number]) {
    const leftover = sale.quantityMade - sale.quantity;
    const totalAmount = sale.quantity * toNumber(sale.unitPrice.toString());
    return { leftover, totalAmount };
  }

  const total = sales.reduce(
    (sum, sale) => sum + computeLeftoverAndTotal(sale).totalAmount,
    0
  );

  // Lets the Sales form prefill "Tubs made" with the regular-price row's
  // leftover the moment "Sale" is checked for that food item/date, instead
  // of the leftover having to be looked up and typed in by hand.
  const leftoverByKey: Record<string, number> = {};
  for (const sale of sales) {
    if (sale.isSale) continue;
    const key = `${utcDateKey(sale.date)}_${sale.foodItemId}`;
    leftoverByKey[key] = sale.quantityMade - sale.quantity;
  }

  const groups: {
    key: string;
    label: string;
    items: typeof sales;
    subtotal: number;
  }[] = [];
  for (const sale of sales) {
    const key = utcDateKey(sale.date);
    const amount = computeLeftoverAndTotal(sale).totalAmount;
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.key === key) {
      currentGroup.items.push(sale);
      currentGroup.subtotal += amount;
    } else {
      groups.push({
        key,
        label: formatGroupDate(sale.date),
        items: [sale],
        subtotal: amount,
      });
    }
  }

  const hasNegativeLeftover = groups.some((group) =>
    group.items.some((sale) => computeLeftoverAndTotal(sale).leftover < 0)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-brown">Sales</h1>
        <p className="mt-1 text-sm text-brand-brown-light">
          Record each sale for a food item.
        </p>
      </div>

      {hasNegativeLeftover && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          ⚠ Some rows below (marked in red) show more sold than made — that
          happens once orders for an item pass its recorded &quot;Tubs
          made,&quot; and isn&apos;t itself an error. Edit that row and
          update Tubs made once you know the real total made for the day.
        </p>
      )}

      <FilterForm suppressHydrationWarning className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Search
          </label>
          <input suppressHydrationWarning
            name="search"
            type="text"
            placeholder="Food item"
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
            Food item
          </label>
          <select
            name="foodItemId"
            defaultValue={foodItemIdFilter ?? "All"}
            className="mt-1 rounded-md border border-brand-tan px-3 py-2 text-sm"
          >
            <option value="All">All</option>
            {filterableFoodItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
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
          href="/sales"
          className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
        >
          Reset
        </Link>
        <Link
          href={`/sales?from=${toDateInputValue(new Date())}&to=${toDateInputValue(new Date())}`}
          className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
        >
          Today
        </Link>
      </FilterForm>

      <SalesSection
        action={upsertSale}
        menuByDate={menuByDate}
        leftoverByKey={leftoverByKey}
        allFoodItems={foodItems.map((item) => ({
          id: item.id,
          name: item.name,
          sellingPrice: item.sellingPrice.toString(),
        }))}
        defaultDate={toDateInputValue(new Date())}
        groups={groups.map((group) => ({
          ...group,
          items: group.items.map((sale) => {
            const { leftover, totalAmount } = computeLeftoverAndTotal(sale);
            return {
              id: sale.id,
              foodItemId: sale.foodItemId,
              quantityMade: sale.quantityMade,
              quantity: sale.quantity,
              leftover,
              unitPrice: sale.unitPrice.toString(),
              totalAmount: totalAmount.toString(),
              isSale: sale.isSale,
              foodItemName: sale.foodItem.name,
              date: utcDateKey(sale.date),
            };
          }),
        }))}
        deleteAction={deleteSale}
        bulkDeleteAction={deleteSales}
        totalLabel={`Total (${formatRangeDate(fromDate)} – ${formatRangeDate(toDate)})`}
        total={total}
        emptyMessage={
          search || foodItemIdFilter
            ? "No sales match this filter."
            : "No sales recorded in this period."
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
              if (foodItemIdFilter) params.set("foodItemId", foodItemIdFilter);
              return `/sales?${params.toString()}`;
            }}
          />
        }
      />
    </div>
  );
}
