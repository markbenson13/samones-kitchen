import { prisma } from "@/lib/prisma";
import {
  upsertFoodItem,
  deleteFoodItem,
  deleteFoodItems,
  toggleFoodItemActive,
} from "@/app/actions/food-items";
import { FoodItemsSection } from "./food-items-section";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 25;

export default async function FoodItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

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

  const totalPages = Math.max(1, Math.ceil(foodItems.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageIndexes = foodItems
    .map((_, i) => i)
    .slice(pageStart, pageStart + PAGE_SIZE);

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

      <FoodItemsSection
        action={upsertFoodItem}
        items={formItems}
        categories={categories}
        tableItems={pageIndexes.map((i) => ({
          ...formItems[i],
          isActive: foodItems[i].isActive,
        }))}
        toggleAction={toggleFoodItemActive}
        deleteAction={deleteFoodItem}
        bulkDeleteAction={deleteFoodItems}
        pagination={
          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => `/food-items?page=${p}`}
          />
        }
      />
    </div>
  );
}
