"use client";

import { useMemo, useState } from "react";
import { formatMoney, toNumber } from "@/lib/money";
import { SubmitButton } from "@/components/submit-button";
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
}: {
  items: FoodItemRow[];
  toggleAction: (id: string, isActive: boolean) => void | Promise<void>;
  deleteAction: (id: string) => void | Promise<void>;
}) {
  const [sort, setSort] = useState<SortState<SortKey>>(null);

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

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-brand-cream text-xs uppercase text-brand-brown-light">
        <tr>
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
              <form action={toggleAction.bind(null, item.id, !item.isActive)}>
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
              <form action={deleteAction.bind(null, item.id)}>
                <SubmitButton
                  spinnerClassName="h-3 w-3"
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Delete
                </SubmitButton>
              </form>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
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
  );
}
