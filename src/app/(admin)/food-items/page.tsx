import { prisma } from "@/lib/prisma";
import { formatMoney, toNumber } from "@/lib/money";
import {
  upsertFoodItem,
  deleteFoodItem,
  toggleFoodItemActive,
} from "@/app/actions/food-items";
import { FoodItemForm } from "./food-item-form";
import { SubmitButton } from "@/components/submit-button";

export default async function FoodItemsPage() {
  const foodItems = await prisma.foodItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  const formItems = foodItems.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    costPrice: item.costPrice.toString(),
    sellingPrice: item.sellingPrice.toString(),
  }));
  const categories = Array.from(
    new Set(foodItems.map((item) => item.category).filter((c) => c))
  ).sort() as string[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-brown">
          Food Items
        </h1>
        <p className="mt-1 text-sm text-brand-brown-light">
          Set the cost and selling price for each ulam you sell.
        </p>
      </div>

      <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-brand-brown">Add food item</h2>
        <p className="mt-1 text-xs text-brand-brown-light">
          Type an existing name to load and edit that item instead of
          creating a duplicate.
        </p>
        <FoodItemForm
          action={upsertFoodItem}
          items={formItems}
          categories={categories}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-cream text-xs uppercase text-brand-brown-light">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Selling price</th>
              <th className="px-4 py-3">Margin</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-tan/60">
            {foodItems.map((item) => {
              const cost = toNumber(item.costPrice.toString());
              const selling = toNumber(item.sellingPrice.toString());
              const margin = selling - cost;
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-brand-brown">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-brand-brown-light">
                    {item.category ?? "—"}
                  </td>
                  <td className="px-4 py-3">{formatMoney(cost)}</td>
                  <td className="px-4 py-3">{formatMoney(selling)}</td>
                  <td
                    className={`px-4 py-3 ${
                      margin >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {formatMoney(margin)}
                  </td>
                  <td className="px-4 py-3">
                    <form
                      action={toggleFoodItemActive.bind(
                        null,
                        item.id,
                        !item.isActive
                      )}
                    >
                      <SubmitButton
                        spinnerClassName="h-3 w-3"
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          item.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </SubmitButton>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteFoodItem.bind(null, item.id)}>
                      <SubmitButton
                        spinnerClassName="h-3 w-3"
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {foodItems.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-sm text-brand-brown-light"
                >
                  No food items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
