"use client";

import { useState, type ReactNode } from "react";
import { FoodItemForm } from "./food-item-form";
import { FoodItemsTable } from "./food-items-table";

type FoodItemOption = {
  id: string;
  name: string;
  category: string | null;
  costPrice: string;
  sellingPrice: string;
};

type FoodItemRow = FoodItemOption & { isActive: boolean };

export function FoodItemsSection({
  action,
  items,
  categories,
  tableItems,
  toggleAction,
  deleteAction,
  bulkDeleteAction,
  pagination,
}: {
  action: (formData: FormData) => void | Promise<void>;
  items: FoodItemOption[];
  categories: string[];
  tableItems: FoodItemRow[];
  toggleAction: (id: string, isActive: boolean) => void | Promise<void>;
  deleteAction: (id: string) => void | Promise<void>;
  bulkDeleteAction: (ids: string[]) => void | Promise<void>;
  pagination?: ReactNode;
}) {
  const [editingItem, setEditingItem] = useState<FoodItemOption | null>(null);

  return (
    <>
      <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-brand-brown">Add food item</h2>
        <p className="mt-1 text-xs text-brand-brown-light">
          Type an existing name to load and edit that item instead of
          creating a duplicate.
        </p>
        <FoodItemForm
          action={action}
          items={items}
          categories={categories}
          editingItem={editingItem}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        <FoodItemsTable
          items={tableItems}
          toggleAction={toggleAction}
          deleteAction={deleteAction}
          bulkDeleteAction={bulkDeleteAction}
          onEdit={(item) => setEditingItem({ ...item })}
        />
        {pagination}
      </section>
    </>
  );
}
