"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatMoney, toNumber } from "@/lib/money";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { BulkDeleteBar } from "@/components/bulk-delete-bar";
import { useToast, withToast } from "@/components/toast";
import {
  SortableHeader,
  nextSortState,
  compareValues,
  type SortState,
} from "@/components/sortable-header";

type FoodItemRow = {
  id: string;
  name: string;
  category: string | null;
  costPrice: string;
  sellingPrice: string;
  isActive: boolean;
};

type SortKey = "name" | "category" | "cost" | "selling" | "margin";

export function FoodItemsTable({
  items,
  toggleAction,
  deleteAction,
  bulkDeleteAction,
  onEdit,
  emptyMessage = "No food items yet.",
}: {
  items: FoodItemRow[];
  toggleAction: (id: string, isActive: boolean) => void | Promise<void>;
  deleteAction: (id: string) => void | Promise<void>;
  bulkDeleteAction: (ids: string[]) => void | Promise<void>;
  onEdit: (item: FoodItemRow) => void;
  emptyMessage?: string;
}) {
  const [sort, setSort] = useState<SortState<SortKey>>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toast = useToast();

  const rows = useMemo(() => {
    const computed = items.map((item) => {
      const cost = toNumber(item.costPrice);
      const selling = toNumber(item.sellingPrice);
      return { ...item, cost, selling, margin: selling - cost };
    });
    if (!sort) return computed;

    const { key, dir } = sort;
    const sign = dir === "asc" ? 1 : -1;
    return [...computed].sort((a, b) => {
      switch (key) {
        case "name":
          return sign * compareValues(a.name.toLowerCase(), b.name.toLowerCase());
        case "category":
          return (
            sign *
            compareValues(
              (a.category ?? "").toLowerCase(),
              (b.category ?? "").toLowerCase()
            )
          );
        case "cost":
          return sign * compareValues(a.cost, b.cost);
        case "selling":
          return sign * compareValues(a.selling, b.selling);
        case "margin":
          return sign * compareValues(a.margin, b.margin);
      }
    });
  }, [items, sort]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))
    );
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    const ok = await withToast(
      toast,
      () => bulkDeleteAction(ids),
      `${ids.length} food item${ids.length === 1 ? "" : "s"} deleted.`
    );
    if (ok) setSelected(new Set());
  }

  return (
    <>
      <BulkDeleteBar count={selected.size} action={handleBulkDelete} />
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-brand-cream text-xs uppercase text-brand-brown-light">
        <tr>
          <th className="px-4 py-3">
            <input suppressHydrationWarning
              type="checkbox"
              checked={rows.length > 0 && selected.size === rows.length}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-brand-tan text-brand-red focus:ring-brand-red"
            />
          </th>
          <SortableHeader
            label="Name"
            sortKey="name"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Category"
            sortKey="category"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Cost"
            sortKey="cost"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Selling price"
            sortKey="selling"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Margin"
            sortKey="margin"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-brand-tan/60">
        {rows.map((item) => (
          <tr key={item.id}>
            <td className="px-4 py-3">
              <input suppressHydrationWarning
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggleOne(item.id)}
                className="h-4 w-4 rounded border-brand-tan text-brand-red focus:ring-brand-red"
              />
            </td>
            <td className="px-4 py-3 font-medium text-brand-brown">
              {item.name}
            </td>
            <td className="px-4 py-3 text-brand-brown-light">
              {item.category ?? "—"}
            </td>
            <td className="px-4 py-3">{formatMoney(item.cost)}</td>
            <td className="px-4 py-3">{formatMoney(item.selling)}</td>
            <td
              className={`px-4 py-3 ${
                item.margin >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {formatMoney(item.margin)}
            </td>
            <td className="px-4 py-3">
              <form
                suppressHydrationWarning
                action={async () => {
                  await withToast(
                    toast,
                    () => toggleAction(item.id, !item.isActive),
                    item.isActive
                      ? `"${item.name}" marked inactive.`
                      : `"${item.name}" marked active.`
                  );
                }}
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
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  aria-label="Edit"
                  title="Edit"
                  className="rounded-md p-1.5 text-brand-brown hover:bg-brand-cream"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <form
                  suppressHydrationWarning
                  action={async () => {
                    await withToast(
                      toast,
                      () => deleteAction(item.id),
                      `"${item.name}" deleted.`
                    );
                  }}
                >
                  <ConfirmSubmitButton
                    spinnerClassName="h-3 w-3"
                    confirmTitle="Delete this food item?"
                    confirmMessage={`This will permanently delete "${item.name}". This cannot be undone.`}
                    confirmLabel="Delete"
                    danger
                    aria-label="Delete"
                    title="Delete"
                    className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </ConfirmSubmitButton>
                </form>
              </div>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td
              colSpan={8}
              className="px-4 py-6 text-center text-sm text-brand-brown-light"
            >
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
      </table>
      </div>
    </>
  );
}

