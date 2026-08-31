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

type CostRow = {
  id: string;
  description: string;
  quantity: string | null;
  amount: string;
};

type Group = {
  key: string;
  label: string;
  items: CostRow[];
  subtotal: number;
};

type SortKey = "description" | "quantity" | "amount";

function sortItems(items: CostRow[], sort: SortState<SortKey>) {
  if (!sort) return items;
  const { key, dir } = sort;
  const sign = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    switch (key) {
      case "description":
        return (
          sign * compareValues(a.description.toLowerCase(), b.description.toLowerCase())
        );
      case "quantity":
        return sign * compareValues(a.quantity ?? "", b.quantity ?? "");
      case "amount":
        return sign * compareValues(toNumber(a.amount), toNumber(b.amount));
    }
  });
}

export function MarketCostsTable({
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
            label="Description"
            sortKey="description"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Quantity"
            sortKey="quantity"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Amount"
            sortKey="amount"
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
          labelColSpan={2}
          subtotal={formatMoney(group.subtotal)}
          trailingColSpan={1}
        >
          {group.items.map((cost) => (
            <tr key={cost.id}>
              <td className="px-4 py-3 font-medium text-brand-brown">
                {cost.description}
              </td>
              <td className="px-4 py-3 text-brand-brown-light">
                {cost.quantity ?? "—"}
              </td>
              <td className="px-4 py-3">{formatMoney(cost.amount)}</td>
              <td className="px-4 py-3 text-right">
                <form action={deleteAction.bind(null, cost.id)}>
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
        </CollapsibleGroup>
      ))}
      <tfoot className="border-t-2 border-brand-tan bg-brand-cream">
        <tr>
          <td className="px-4 py-3 font-medium text-brand-brown" colSpan={2}>
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
