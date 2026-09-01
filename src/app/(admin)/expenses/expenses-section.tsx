"use client";

import { useState, type ReactNode } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { ExpenseForm, type EditingExpense } from "./expense-form";
import { ExpensesTable } from "./expenses-table";

type ExpenseRow = {
  id: string;
  description: string;
  amount: string;
  date: string;
};

type Group = { key: string; label: string; items: ExpenseRow[]; subtotal: number };

export function ExpensesSection({
  action,
  defaultDate,
  groups,
  deleteAction,
  bulkDeleteAction,
  totalLabel,
  total,
  emptyMessage = "No expenses logged in this period.",
  pagination,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultDate: string;
  groups: Group[];
  deleteAction: (id: string) => void | Promise<void>;
  bulkDeleteAction: (ids: string[]) => void | Promise<void>;
  totalLabel: string;
  total: number;
  emptyMessage?: string;
  pagination?: ReactNode;
}) {
  const [editingExpense, setEditingExpense] = useState<EditingExpense | null>(
    null
  );
  // Collapsed by default — declutters the page for the routine case of
  // browsing/correcting past entries, and expands automatically the moment
  // an edit is requested.
  const [formOpen, setFormOpen] = useState(false);

  function handleOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingExpense(null);
  }

  return (
    <>
      <CollapsibleSection
        title={editingExpense ? "Edit expense" : "Add expense"}
        defaultOpen={false}
        open={editingExpense !== null || formOpen}
        onOpenChange={handleOpenChange}
      >
        <ExpenseForm
          action={action}
          defaultDate={defaultDate}
          editingExpense={editingExpense}
          onCancelEdit={() => handleOpenChange(false)}
        />
      </CollapsibleSection>

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        {groups.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brand-brown-light">
            {emptyMessage}
          </p>
        ) : (
          <ExpensesTable
            groups={groups}
            deleteAction={deleteAction}
            bulkDeleteAction={bulkDeleteAction}
            totalLabel={totalLabel}
            total={total}
            onEdit={(expense) => {
              setEditingExpense({
                id: expense.id,
                description: expense.description,
                amount: expense.amount,
                date: expense.date,
              });
              setFormOpen(true);
            }}
          />
        )}
        {pagination}
      </section>
    </>
  );
}
