import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  upsertFoodItem,
  deleteFoodItem,
  deleteFoodItems,
  toggleFoodItemActive,
} from "@/app/actions/food-items";
import { SubmitButton } from "@/components/submit-button";
import { FoodItemsSection } from "./food-items-section";
import { Pagination } from "@/components/pagination";
import { FilterForm } from "@/components/filter-form";

const PAGE_SIZE = 25;

export default async function FoodItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>;
}) {
  const {
    page: pageParam,
    search: searchParam,
    category: categoryParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = searchParam?.trim() || undefined;
  const category = categoryParam && categoryParam !== "All" ? categoryParam : undefined;
  const where = {
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(category ? { category } : {}),
  };

  // Unfiltered — the "Add food item" form's name/category Combobox lookups
  // (and its duplicate-name detection) need every item, not just whatever
  // the table below is currently filtered to.
  const [allFoodItems, tableFoodItems, tableCount] = await Promise.all([
    prisma.foodItem.findMany({ orderBy: { name: "asc" } }),
    prisma.foodItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.foodItem.count({ where }),
  ]);

  const formItems = allFoodItems.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    costPrice: item.costPrice.toString(),
    sellingPrice: item.sellingPrice.toString(),
  }));
  const categories = Array.from(
    new Set(allFoodItems.map((item) => item.category).filter((c) => c))
  ).sort() as string[];

  const totalPages = Math.max(1, Math.ceil(tableCount / PAGE_SIZE));

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

      <FilterForm suppressHydrationWarning className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Search
          </label>
          <input suppressHydrationWarning
            name="search"
            type="text"
            placeholder="Item name"
            defaultValue={search ?? ""}
            className="mt-1 rounded-md border border-brand-tan px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Category
          </label>
          <select
            name="category"
            defaultValue={category ?? "All"}
            className="mt-1 rounded-md border border-brand-tan px-3 py-2 text-sm"
          >
            <option value="All">All</option>
            {categories.map((c) => (
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
          href="/food-items"
          className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
        >
          Reset
        </Link>
      </FilterForm>

      <FoodItemsSection
        action={upsertFoodItem}
        items={formItems}
        categories={categories}
        tableItems={tableFoodItems.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          costPrice: item.costPrice.toString(),
          sellingPrice: item.sellingPrice.toString(),
          isActive: item.isActive,
        }))}
        toggleAction={toggleFoodItemActive}
        deleteAction={deleteFoodItem}
        bulkDeleteAction={deleteFoodItems}
        emptyMessage={
          search || category
            ? "No food items match this filter."
            : "No food items yet."
        }
        pagination={
          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => {
              const params = new URLSearchParams({ page: String(p) });
              if (search) params.set("search", search);
              if (category) params.set("category", category);
              return `/food-items?${params.toString()}`;
            }}
          />
        }
      />
    </div>
  );
}
