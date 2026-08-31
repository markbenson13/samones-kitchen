"use client";

import { useState, type ReactNode } from "react";
import { SaleForm, type EditingSale } from "./sale-form";
import { SalesTable } from "./sales-table";

type FoodItemOption = { id: string; name: string; sellingPrice: string };

type SaleRow = {
  id: string;
  foodItemId: string;
  quantityMade: number;
  leftover: number;
  unitPrice: string;
  totalAmount: string;
  foodItemName: string;
  foodItemSellingPrice: string;
  date: string;
};

type Group = { key: string; label: string; items: SaleRow[]; subtotal: number };

export function SalesSection({
  action,
  menuByDate,
  allFoodItems,
  defaultDate,
  groups,
  deleteAction,
  bulkDeleteAction,
  totalLabel,
  total,
  pagination,
}: {
  action: (formData: FormData) => void | Promise<void>;
  menuByDate: Record<string, FoodItemOption[]>;
  allFoodItems: FoodItemOption[];
  defaultDate: string;
  groups: Group[];
  deleteAction: (id: string) => void | Promise<void>;
  bulkDeleteAction: (ids: string[]) => void | Promise<void>;
  totalLabel: string;
  total: number;
  pagination?: ReactNode;
}) {
  const [editingSale, setEditingSale] = useState<EditingSale | null>(null);

  return (
    <>
      <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-brand-brown">
          {editingSale ? "Edit sale" : "Record sale"}
        </h2>
        {allFoodItems.length === 0 ? (
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
              action={action}
              menuByDate={menuByDate}
              allFoodItems={allFoodItems}
              defaultDate={defaultDate}
              editingSale={editingSale}
              onCancelEdit={() => setEditingSale(null)}
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
          <SalesTable
            groups={groups}
            deleteAction={deleteAction}
            bulkDeleteAction={bulkDeleteAction}
            totalLabel={totalLabel}
            total={total}
            onEdit={(sale) =>
              setEditingSale({
                id: sale.id,
                foodItemId: sale.foodItemId,
                quantityMade: sale.quantityMade,
                unitPrice: sale.unitPrice,
                date: sale.date,
              })
            }
          />
        )}
        {pagination}
      </section>
    </>
  );
}
