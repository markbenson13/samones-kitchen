import { prisma } from "@/lib/prisma";
import { formatMoney, toNumber } from "@/lib/money";
import { toDateInputValue, utcDateKey, formatGroupDate } from "@/lib/date";
import { getDailyMenuByDate } from "@/lib/daily-menu";
import { createSale, deleteSale } from "@/app/actions/sales";
import { SaleForm } from "./sale-form";
import { CollapsibleGroup } from "@/components/collapsible-group";

export default async function SalesPage() {
  const [sales, foodItems, leftoverAgg, orderedAgg, menuByDate] =
    await Promise.all([
      prisma.sale.findMany({
        orderBy: { date: "desc" },
        include: { foodItem: true },
        take: 100,
      }),
      prisma.foodItem.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.sale.aggregate({ _sum: { leftover: true } }),
      prisma.order.aggregate({ _sum: { quantity: true } }),
      getDailyMenuByDate(),
    ]);

  const total = sales.reduce(
    (sum, sale) => sum + toNumber(sale.totalAmount.toString()),
    0
  );

  // Orders claim stock from what's recorded as leftover, so total leftover
  // is what's left over from sales minus everything ordered against it.
  const totalLeftover =
    (leftoverAgg._sum.leftover ?? 0) - (orderedAgg._sum.quantity ?? 0);

  const groups: {
    key: string;
    label: string;
    items: typeof sales;
    subtotal: number;
  }[] = [];
  for (const sale of sales) {
    const key = utcDateKey(sale.date);
    const amount = toNumber(sale.totalAmount.toString());
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

      <div className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase text-brand-brown-light">
          Total Leftover
        </p>
        <p className="mt-2 text-2xl font-semibold text-brand-brown">
          {totalLeftover}
        </p>
        <p className="mt-1 text-xs text-brand-brown-light">
          Leftover recorded on sales, minus everything claimed via orders.
        </p>
      </div>

      <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-brand-brown">Record sale</h2>
        {foodItems.length === 0 ? (
          <p className="mt-4 text-sm text-brand-brown-light">
            Add an active food item first before recording a sale.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-brand-brown-light">
              Unit price defaults to the item&apos;s current selling price —
              lower it to record a clearance/discounted sale instead of
              creating a duplicate food item.
            </p>
            <SaleForm
              action={createSale}
              menuByDate={menuByDate}
              allFoodItems={foodItems.map((item) => ({
                id: item.id,
                name: item.name,
                sellingPrice: item.sellingPrice.toString(),
              }))}
              defaultDate={toDateInputValue(new Date())}
            />
          </>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        {groups.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brand-brown-light">
            No sales recorded yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-cream text-xs uppercase text-brand-brown-light">
              <tr>
                <th className="px-4 py-3">Food item</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Leftover</th>
                <th className="px-4 py-3">Unit price</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            {groups.map((group) => (
              <CollapsibleGroup
                key={group.key}
                label={group.label}
                labelColSpan={4}
                subtotal={formatMoney(group.subtotal)}
                trailingColSpan={1}
              >
                {group.items.map((sale) => {
                  const isSale =
                    toNumber(sale.unitPrice.toString()) <
                    toNumber(sale.foodItem.sellingPrice.toString());
                  return (
                    <tr key={sale.id}>
                      <td className="px-4 py-3 font-medium text-brand-brown">
                        {sale.foodItem.name}
                        {isSale && (
                          <span className="ml-2 rounded-full bg-brand-gold/20 px-2 py-0.5 text-xs font-medium text-brand-red">
                            Sale
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{sale.quantity}</td>
                      <td className="px-4 py-3 text-brand-brown-light">
                        {sale.leftover}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(sale.unitPrice.toString())}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(sale.totalAmount.toString())}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form action={deleteSale.bind(null, sale.id)}>
                          <button
                            type="submit"
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </CollapsibleGroup>
            ))}
            <tfoot className="border-t-2 border-brand-tan bg-brand-cream">
              <tr>
                <td
                  className="px-4 py-3 font-medium text-brand-brown"
                  colSpan={4}
                >
                  Total (last {sales.length})
                </td>
                <td className="px-4 py-3 font-semibold text-brand-brown">
                  {formatMoney(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </div>
  );
}
