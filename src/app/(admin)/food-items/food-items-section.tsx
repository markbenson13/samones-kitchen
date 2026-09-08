"use client";

import { useState, type ReactNode } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";
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
  emptyMessage,
  pagination,
}: {
  action: (formData: FormData) => void | Promise<void>;
  items: FoodItemOption[];
  categories: string[];
  tableItems: FoodItemRow[];
  toggleAction: (id: string, isActive: boolean) => void | Promise<void>;
  deleteAction: (id: string) => void | Promise<void>;
  bulkDeleteAction: (ids: string[]) => void | Promise<void>;
  emptyMessage?: string;
  pagination?: ReactNode;
}) {
  const [editingItem, setEditingItem] = useState<FoodItemOption | null>(null);
  // Collapsed by default — declutters the page for the routine case of
  // browsing/correcting prices, and expands automatically the moment an
  // edit is requested.
  const [formOpen, setFormOpen] = useState(false);

  function handleOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingItem(null);
  }

  return (
    <>
      <CollapsibleSection
        title={editingItem ? "Edit food item" : "Add food item"}
        description="Type an existing name to load and edit that item instead of creating a duplicate."
        defaultOpen={false}
        open={editingItem !== null || formOpen}
        onOpenChange={handleOpenChange}
      >
        <FoodItemForm
          action={action}
          items={items}
          categories={categories}
          editingItem={editingItem}
          onCancelEdit={() => handleOpenChange(false)}
        />
      </CollapsibleSection>

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        <FoodItemsTable
          items={tableItems}
          toggleAction={toggleAction}
          deleteAction={deleteAction}
          bulkDeleteAction={bulkDeleteAction}
          onEdit={(item) => {
            setEditingItem({ ...item });
            setFormOpen(true);
          }}
          emptyMessage={emptyMessage}
        />
        {pagination}
      </section>
    </>
  );
}
