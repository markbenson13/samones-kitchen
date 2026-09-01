"use client";

import { useState, type ReactNode } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { MarketCostForm, type EditingCost } from "./market-cost-form";
import { MarketCostsTable } from "./market-costs-table";

type CostRow = {
  id: string;
  description: string;
  quantity: string | null;
  amount: string;
  date: string;
};

type Group = { key: string; label: string; items: CostRow[]; subtotal: number };

export function MarketCostsSection({
  action,
  defaultDate,
  groups,
  deleteAction,
  bulkDeleteAction,
  totalLabel,
  total,
  emptyMessage = "No market costs logged in this period.",
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
  const [editingCost, setEditingCost] = useState<EditingCost | null>(null);
  // Collapsed by default — declutters the page for the routine case of
  // browsing/correcting past entries, and expands automatically the moment
  // an edit is requested.
  const [formOpen, setFormOpen] = useState(false);

  function handleOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingCost(null);
  }

  return (
    <>
      <CollapsibleSection
        title={editingCost ? "Edit cost" : "Add cost"}
        defaultOpen={false}
        open={editingCost !== null || formOpen}
        onOpenChange={handleOpenChange}
      >
        <MarketCostForm
          action={action}
          defaultDate={defaultDate}
          editingCost={editingCost}
          onCancelEdit={() => handleOpenChange(false)}
        />
      </CollapsibleSection>

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        {groups.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brand-brown-light">
            {emptyMessage}
          </p>
        ) : (
          <MarketCostsTable
            groups={groups}
            deleteAction={deleteAction}
            bulkDeleteAction={bulkDeleteAction}
            totalLabel={totalLabel}
            total={total}
            onEdit={(cost) => {
              setEditingCost({
                id: cost.id,
                description: cost.description,
                quantity: cost.quantity,
                amount: cost.amount,
                date: cost.date,
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
