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
  bulkDeleteAction,
  totalLabel,
  total,
}: {
  groups: Group[];
  deleteAction: (id: string) => void | Promise<void>;
  bulkDeleteAction: (ids: string[]) => void | Promise<void>;
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
            <input
              type="checkbox"
              checked={allIds.length > 0 && selected.size === allIds.length}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-brand-tan text-brand-red focus:ring-brand-red"
            />
          </th>
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
          labelColSpan={3}
          subtotal={formatMoney(group.subtotal)}
          trailingColSpan={1}
        >
          {group.items.map((cost) => (
            <tr key={cost.id}>
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(cost.id)}
                  onChange={() => toggleOne(cost.id)}
                  className="h-4 w-4 rounded border-brand-tan text-brand-red focus:ring-brand-red"
                />
              </td>
              <td className="px-4 py-3 font-medium text-brand-brown">
                {cost.description}
              </td>
              <td className="px-4 py-3 text-brand-brown-light">
                {cost.quantity ?? "—"}
              </td>
              <td className="px-4 py-3">{formatMoney(cost.amount)}</td>
              <td className="px-4 py-3 text-right">
                <form suppressHydrationWarning action={deleteAction.bind(null, cost.id)}>
                  <ConfirmSubmitButton
                    spinnerClassName="h-3 w-3"
                    confirmTitle="Delete this market cost?"
                    confirmMessage={`This will permanently delete "${cost.description}". This cannot be undone.`}
                    confirmLabel="Delete"
                    danger
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </td>
            </tr>
          ))}
        </CollapsibleGroup>
      ))}
      <tfoot className="border-t-2 border-brand-tan bg-brand-cream">
        <tr>
          <td className="px-4 py-3 font-medium text-brand-brown" colSpan={3}>
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
