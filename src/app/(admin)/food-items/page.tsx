import { prisma } from "@/lib/prisma";
import {
  upsertFoodItem,
  deleteFoodItem,
  toggleFoodItemActive,
} from "@/app/actions/food-items";
import { FoodItemForm } from "./food-item-form";
import { FoodItemsTable } from "./food-items-table";

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
        <FoodItemsTable
          items={formItems.map((item, i) => ({
            ...item,
            isActive: foodItems[i].isActive,
          }))}
          toggleAction={toggleFoodItemActive}
          deleteAction={deleteFoodItem}
        />
      </section>
    </div>
  );
}
