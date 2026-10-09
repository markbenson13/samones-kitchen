"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatMoney, toNumber } from "@/lib/money";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { SubmitButton } from "@/components/submit-button";
import { BulkDeleteBar } from "@/components/bulk-delete-bar";
import { CollapsibleGroup } from "@/components/collapsible-group";
import { useToast, withToast } from "@/components/toast";
import {
  SortableHeader,
  nextSortState,
  compareValues,
  type SortState,
} from "@/components/sortable-header";

type ExpenseRow = {
  id: string;
  description: string;
  amount: string;
  category: string;
  date: string;
};

type Group = {
  key: string;
  label: string;
  items: ExpenseRow[];
  subtotal: number;
};

type SortKey = "description" | "amount" | "category";

function sortItems(items: ExpenseRow[], sort: SortState<SortKey>) {
  if (!sort) return items;
  const { key, dir } = sort;
  const sign = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    switch (key) {
      case "description":
        return (
          sign * compareValues(a.description.toLowerCase(), b.description.toLowerCase())
        );
      case "amount":
        return sign * compareValues(toNumber(a.amount), toNumber(b.amount));
      case "category":
        return sign * compareValues(a.category.toLowerCase(), b.category.toLowerCase());
    }
  });
}

export function ExpensesTable({
  groups,
  deleteAction,
  bulkDeleteAction,
  bulkCategoryAction,
  onEdit,
  totalLabel,
  total,
}: {
  groups: Group[];
  deleteAction: (id: string) => void | Promise<void>;
  bulkDeleteAction: (ids: string[]) => void | Promise<void>;
  bulkCategoryAction: (ids: string[], category: string) => void | Promise<void>;
  onEdit: (expense: ExpenseRow) => void;
  totalLabel: string;
  total: number;
}) {
  const [sort, setSort] = useState<SortState<SortKey>>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const toast = useToast();

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
    const ids = Array.from(selected);
    const ok = await withToast(
      toast,
      () => bulkDeleteAction(ids),
      `${ids.length} expense${ids.length === 1 ? "" : "s"} deleted.`
    );
    if (ok) setSelected(new Set());
  }

  async function handleBulkCategory() {
    const ids = Array.from(selected);
    const ok = await withToast(
      toast,
      () => bulkCategoryAction(ids, bulkCategory),
      `${ids.length} expense${ids.length === 1 ? "" : "s"} set to "${bulkCategory}".`
    );
    if (ok) setSelected(new Set());
  }

  return (
    <>
      <BulkDeleteBar
        count={selected.size}
        action={handleBulkDelete}
        extraActions={
          selected.size > 0 ? (
            <form
              suppressHydrationWarning
              action={handleBulkCategory}
              className="flex items-center gap-1.5"
            >
              <select suppressHydrationWarning
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                aria-label="Category to apply to selected rows"
                className="rounded-md border border-brand-tan px-2 py-1.5 text-xs"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <SubmitButton
                spinnerClassName="h-3 w-3"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-brand-brown hover:bg-brand-cream"
              >
                Set category
              </SubmitButton>
            </form>
          ) : null
        }
      />
      <div className="overflow-x-auto">
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
            label="Description"
            sortKey="description"
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
          {group.items.map((expense) => (
            <tr key={expense.id}>
              <td className="px-4 py-3">
                <input suppressHydrationWarning
                  type="checkbox"
                  checked={selected.has(expense.id)}
                  onChange={() => toggleOne(expense.id)}
                  className="h-4 w-4 rounded border-brand-tan text-brand-red focus:ring-brand-red"
                />
              </td>
              <td className="px-4 py-3 font-medium text-brand-brown">
                {expense.description}
              </td>
              <td className="px-4 py-3 text-brand-brown-light">
                {expense.category}
              </td>
              <td className="px-4 py-3">{formatMoney(expense.amount)}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => onEdit(expense)}
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
                        () => deleteAction(expense.id),
                        `"${expense.description}" deleted.`
                      );
                    }}
                  >
                    <ConfirmSubmitButton
                      spinnerClassName="h-3 w-3"
                      confirmTitle="Delete this expense?"
                      confirmMessage={`This will permanently delete "${expense.description}". This cannot be undone.`}
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
      </div>
    </>
  );
}
