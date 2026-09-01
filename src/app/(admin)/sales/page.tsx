import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { toDateInputValue, utcDateKey, formatGroupDate } from "@/lib/date";
import { getDailyMenuByDate } from "@/lib/daily-menu";
import { upsertSale, deleteSale, deleteSales } from "@/app/actions/sales";
import { SalesSection } from "./sales-section";
import { Pagination } from "@/components/pagination";
import { SubmitButton } from "@/components/submit-button";

const PAGE_SIZE = 25;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; date?: string; foodItemId?: string }>;
}) {
  const {
    page: pageParam,
    date: dateParam,
    foodItemId: foodItemIdParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const dateFilter = dateParam || undefined;
  const foodItemIdFilter = foodItemIdParam || undefined;
  const where = {
    ...(dateFilter ? { date: new Date(dateFilter) } : {}),
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

  const today = toDateInputValue(new Date());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-brown">Sales</h1>
        <p className="mt-1 text-sm text-brand-brown-light">
          Record each sale for a food item.
        </p>
      </div>

      <form suppressHydrationWarning className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Date
          </label>
          <input suppressHydrationWarning
            name="date"
            type="date"
            defaultValue={dateFilter ?? ""}
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
          href={`/sales?date=${today}`}
          className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
        >
          Today
        </Link>
      </form>

      <SalesSection
        action={upsertSale}
        menuByDate={menuByDate}
        leftoverByKey={leftoverByKey}
        allFoodItems={foodItems.map((item) => ({
          id: item.id,
          name: item.name,
          sellingPrice: item.sellingPrice.toString(),
        }))}
        defaultDate={today}
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
        totalLabel={`Total (page ${page} of ${totalPages})`}
        total={total}
        emptyMessage={
          dateFilter || foodItemIdFilter
            ? "No sales match this filter."
            : "No sales recorded yet."
        }
        pagination={
          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => {
              const params = new URLSearchParams({ page: String(p) });
              if (dateFilter) params.set("date", dateFilter);
              if (foodItemIdFilter) params.set("foodItemId", foodItemIdFilter);
              return `/sales?${params.toString()}`;
            }}
          />
        }
      />
    </div>
  );
}
