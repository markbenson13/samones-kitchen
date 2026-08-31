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

  const [sales, salesCount, foodItems, menuByDate] = await Promise.all([
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
