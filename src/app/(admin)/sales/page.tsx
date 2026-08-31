import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { toDateInputValue, utcDateKey, formatGroupDate } from "@/lib/date";
import { getDailyMenuByDate } from "@/lib/daily-menu";
import { upsertSale, deleteSale, deleteSales } from "@/app/actions/sales";
import { SalesSection } from "./sales-section";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 25;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [sales, salesCount, foodItems, orders, menuByDate] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { date: "desc" },
      include: { foodItem: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.sale.count(),
    prisma.foodItem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.order.findMany({ select: { foodItemId: true, date: true, quantity: true } }),
    getDailyMenuByDate(),
  ]);

  const totalPages = Math.max(1, Math.ceil(salesCount / PAGE_SIZE));

  // Leftover/Total are derived live from whatever's currently ordered for a
  // food item on a date, rather than a stored sold-quantity snapshot — so
  // they stay accurate even if orders are added/removed after the sale was
  // recorded.
  const orderedByItemAndDay = new Map<string, number>();
  for (const order of orders) {
    const key = `${order.foodItemId}::${utcDateKey(order.date)}`;
    orderedByItemAndDay.set(
      key,
      (orderedByItemAndDay.get(key) ?? 0) + order.quantity
    );
  }

  function computeLeftoverAndTotal(sale: (typeof sales)[number]) {
    const ordered =
      orderedByItemAndDay.get(
        `${sale.foodItemId}::${utcDateKey(sale.date)}`
      ) ?? 0;
    const leftover = sale.quantityMade - ordered;
    const totalAmount =
      (sale.quantityMade - leftover) * toNumber(sale.unitPrice.toString());
    return { leftover, totalAmount };
  }

  const total = sales.reduce(
    (sum, sale) => sum + computeLeftoverAndTotal(sale).totalAmount,
    0
  );

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-brown">Sales</h1>
        <p className="mt-1 text-sm text-brand-brown-light">
          Record each sale for a food item.
        </p>
      </div>

      <SalesSection
        action={upsertSale}
        menuByDate={menuByDate}
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
              leftover,
              unitPrice: sale.unitPrice.toString(),
              totalAmount: totalAmount.toString(),
              foodItemName: sale.foodItem.name,
              foodItemSellingPrice: sale.foodItem.sellingPrice.toString(),
              date: utcDateKey(sale.date),
            };
          }),
        }))}
        deleteAction={deleteSale}
        bulkDeleteAction={deleteSales}
        totalLabel={`Total (page ${page} of ${totalPages})`}
        total={total}
        pagination={
          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => `/sales?page=${p}`}
          />
        }
      />
    </div>
  );
}
