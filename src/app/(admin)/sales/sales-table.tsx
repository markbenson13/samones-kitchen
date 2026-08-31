"use client";

import { useMemo, useState } from "react";
import { formatMoney, toNumber } from "@/lib/money";
import { SubmitButton } from "@/components/submit-button";
import { CollapsibleGroup } from "@/components/collapsible-group";
import {
  SortableHeader,
  nextSortState,
  compareValues,
  type SortState,
} from "@/components/sortable-header";

type SaleRow = {
  id: string;
  quantity: number;
  leftover: number;
  unitPrice: string;
  totalAmount: string;
  foodItemName: string;
  foodItemSellingPrice: string;
};

type Group = {
  key: string;
  label: string;
  items: SaleRow[];
  subtotal: number;
};

type SortKey = "foodItem" | "quantity" | "leftover" | "unitPrice" | "total";

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
  totalLabel,
  total,
}: {
  groups: Group[];
  deleteAction: (id: string) => void | Promise<void>;
  totalLabel: string;
  total: number;
}) {
  const [sort, setSort] = useState<SortState<SortKey>>(null);

  const sortedGroups = useMemo(
    () => groups.map((group) => ({ ...group, items: sortItems(group.items, sort) })),
    [groups, sort]
  );

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-brand-cream text-xs uppercase text-brand-brown-light">
        <tr>
          <SortableHeader
            label="Food item"
            sortKey="foodItem"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Qty"
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
          labelColSpan={4}
          subtotal={formatMoney(group.subtotal)}
          trailingColSpan={1}
        >
          {group.items.map((sale) => {
            const isSale = toNumber(sale.unitPrice) < toNumber(sale.foodItemSellingPrice);
            return (
              <tr key={sale.id}>
                <td className="px-4 py-3 font-medium text-brand-brown">
                  {sale.foodItemName}
                  {isSale && (
                    <span className="ml-2 rounded-full bg-brand-gold/20 px-2 py-0.5 text-xs font-medium text-brand-red">
                      Sale
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{sale.quantity}</td>
                <td className="px-4 py-3 text-brand-brown-light">
                  {sale.leftover}
                </td>
                <td className="px-4 py-3">{formatMoney(sale.unitPrice)}</td>
                <td className="px-4 py-3">{formatMoney(sale.totalAmount)}</td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteAction.bind(null, sale.id)}>
                    <SubmitButton
                      spinnerClassName="h-3 w-3"
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            );
          })}
        </CollapsibleGroup>
      ))}
      <tfoot className="border-t-2 border-brand-tan bg-brand-cream">
        <tr>
          <td className="px-4 py-3 font-medium text-brand-brown" colSpan={4}>
            {totalLabel}
          </td>
          <td className="px-4 py-3 font-semibold text-brand-brown">
            {formatMoney(total)}
          </td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}
