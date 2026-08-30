import { prisma } from "@/lib/prisma";
import { formatMoney, toNumber } from "@/lib/money";
import {
  createFoodItem,
  deleteFoodItem,
  toggleFoodItemActive,
} from "@/app/actions/food-items";

export default async function FoodItemsPage() {
  const foodItems = await prisma.foodItem.findMany({
    orderBy: { createdAt: "desc" },
  });

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
        <form
          action={createFoodItem}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-brand-brown-light">
              Name
            </label>
            <input
              name="name"
              type="text"
              required
              placeholder="e.g. Adobo"
              className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-brown-light">
              Category
            </label>
            <input
              name="category"
              type="text"
              placeholder="Optional"
              className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-brown-light">
              Cost price
            </label>
            <input
              name="costPrice"
              type="number"
              step="0.01"
              min="0"
              required
              className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-brown-light">
              Selling price
            </label>
            <input
              name="sellingPrice"
              type="number"
              step="0.01"
              min="0"
              required
              className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end lg:col-span-5">
            <button
              type="submit"
              className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
            >
              Add item
            </button>
          </div>
        </form>
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
                      <button
                        type="submit"
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          item.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteFoodItem.bind(null, item.id)}>
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
