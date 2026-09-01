"use client";

import { useMemo, useState } from "react";
import { formatMoney, toNumber } from "@/lib/money";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { BulkDeleteBar } from "@/components/bulk-delete-bar";
import { CollapsibleGroup } from "@/components/collapsible-group";
import {
  SortableHeader,
  nextSortState,
  compareValues,
  type SortState,
} from "@/components/sortable-header";

type SaleRow = {
  id: string;
  foodItemId: string;
  quantityMade: number;
  quantity: number;
  leftover: number;
  unitPrice: string;
  totalAmount: string;
  isSale: boolean;
  foodItemName: string;
  date: string;
};

type Group = {
  key: string;
  label: string;
  items: SaleRow[];
  subtotal: number;
};

type SortKey =
  | "foodItem"
  | "quantityMade"
  | "quantity"
  | "leftover"
  | "unitPrice"
  | "total";

function sortItems(items: SaleRow[], sort: SortState<SortKey>) {
  if (!sort) return items;
  const { key, dir } = sort;
  const sign = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    switch (key) {
      case "foodItem":
        return (
          sign *
          compareValues(
            a.foodItemName.toLowerCase(),
            b.foodItemName.toLowerCase()
          )
        );
      case "quantityMade":
        return sign * compareValues(a.quantityMade, b.quantityMade);
      case "quantity":
        return sign * compareValues(a.quantity, b.quantity);
      case "leftover":
        return sign * compareValues(a.leftover, b.leftover);
      case "unitPrice":
        return sign * compareValues(toNumber(a.unitPrice), toNumber(b.unitPrice));
      case "total":
        return (
          sign * compareValues(toNumber(a.totalAmount), toNumber(b.totalAmount))
        );
    }
  });
}

export function SalesTable({
  groups,
  deleteAction,
  bulkDeleteAction,
  onEdit,
  totalLabel,
  total,
}: {
  groups: Group[];
  deleteAction: (id: string) => void | Promise<void>;
  bulkDeleteAction: (ids: string[]) => void | Promise<void>;
  onEdit: (sale: SaleRow) => void;
  totalLabel: string;
  total: number;
}) {
  const [sort, setSort] = useState<SortState<SortKey>>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sortedGroups = useMemo(
    () => groups.map((group) => ({ ...group, items: sortItems(group.items, sort) })),
    [groups, sort]
  );

  const allIds = useMemo(
    () => sortedGroups.flatMap((group) => group.items.map((item) => item.id)),
    [sortedGroups]
  );

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
      prev.size === allIds.length ? new Set() : new Set(allIds)
    );
  }

  async function handleBulkDelete() {
    await bulkDeleteAction(Array.from(selected));
    setSelected(new Set());
  }

  return (
    <>
      <BulkDeleteBar count={selected.size} action={handleBulkDelete} />
      <table className="w-full text-left text-sm">
      <thead className="bg-brand-cream text-xs uppercase text-brand-brown-light">
        <tr>
          <th className="px-4 py-3">
            <input suppressHydrationWarning
              type="checkbox"
              checked={allIds.length > 0 && selected.size === allIds.length}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-brand-tan text-brand-red focus:ring-brand-red"
            />
          </th>
          <SortableHeader
            label="Food item"
            sortKey="foodItem"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Tubs made"
            sortKey="quantityMade"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Sold"
            sortKey="quantity"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Leftover"
            sortKey="leftover"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Unit price"
            sortKey="unitPrice"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Total"
            sortKey="total"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <th className="px-4 py-3" />
        </tr>
      </thead>
      {sortedGroups.map((group) => (
        <CollapsibleGroup
          key={group.key}
          label={group.label}
          labelColSpan={6}
          subtotal={formatMoney(group.subtotal)}
          trailingColSpan={1}
        >
          {group.items.map((sale) => {
            return (
              <tr
                key={sale.id}
                className={sale.isSale ? "bg-brand-gold/10" : undefined}
              >
                <td className="px-4 py-3">
                  <input suppressHydrationWarning
                    type="checkbox"
                    checked={selected.has(sale.id)}
                    onChange={() => toggleOne(sale.id)}
                    className="h-4 w-4 rounded border-brand-tan text-brand-red focus:ring-brand-red"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-brand-brown">
                  {sale.foodItemName}
                  {sale.isSale && (
                    <span className="ml-2 rounded-full bg-brand-gold/20 px-2 py-0.5 text-xs font-medium text-brand-red">
                      Sale
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-brand-brown-light">
                  {sale.quantityMade}
                </td>
                <td className="px-4 py-3">{sale.quantity}</td>
                <td
                  className={`px-4 py-3 ${
                    sale.leftover < 0 ? "text-red-600" : "text-brand-brown-light"
                  }`}
                >
                  {sale.leftover}
                  {sale.leftover < 0 && (
                    <span
                      className="ml-1 cursor-help"
                      title="Sold more than Tubs made — update Tubs made to fix this."
                    >
                      ⚠
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{formatMoney(sale.unitPrice)}</td>
                <td className="px-4 py-3">{formatMoney(sale.totalAmount)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => onEdit(sale)}
                      className="text-xs font-medium text-brand-brown hover:underline"
                    >
                      Edit
                    </button>
                    <form suppressHydrationWarning action={deleteAction.bind(null, sale.id)}>
                      <ConfirmSubmitButton
                        spinnerClassName="h-3 w-3"
                        confirmTitle="Delete this sale?"
                        confirmMessage={`This will permanently delete the sale record for "${sale.foodItemName}". This cannot be undone.`}
                        confirmLabel="Delete"
                        danger
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </CollapsibleGroup>
      ))}
      <tfoot className="border-t-2 border-brand-tan bg-brand-cream">
        <tr>
          <td className="px-4 py-3 font-medium text-brand-brown" colSpan={6}>
            {totalLabel}
          </td>
          <td className="px-4 py-3 font-semibold text-brand-brown">
            {formatMoney(total)}
          </td>
          <td />
        </tr>
      </tfoot>
      </table>
    </>
  );
}
