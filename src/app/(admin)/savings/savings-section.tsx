"use client";

import { useState, type ReactNode } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { SavingForm, type EditingSaving } from "./saving-form";
import { SavingsTable } from "./savings-table";

type SavingRow = {
  id: string;
  description: string;
  amount: string;
  date: string;
};

type Group = { key: string; label: string; items: SavingRow[]; subtotal: number };

export function SavingsSection({
  action,
  defaultDate,
  groups,
  deleteAction,
  bulkDeleteAction,
  totalLabel,
  total,
  emptyMessage = "No savings logged in this period.",
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
  const [editingSaving, setEditingSaving] = useState<EditingSaving | null>(null);
  // Collapsed by default — declutters the page for the routine case of
  // browsing/correcting past entries, and expands automatically the moment
  // an edit is requested.
  const [formOpen, setFormOpen] = useState(false);

  function handleOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingSaving(null);
  }

  return (
    <>
      <CollapsibleSection
        title={editingSaving ? "Edit entry" : "Add to savings"}
        defaultOpen={false}
        open={editingSaving !== null || formOpen}
        onOpenChange={handleOpenChange}
      >
        <SavingForm
          action={action}
          defaultDate={defaultDate}
          editingSaving={editingSaving}
          onCancelEdit={() => handleOpenChange(false)}
        />
      </CollapsibleSection>

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        {groups.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brand-brown-light">
            {emptyMessage}
          </p>
        ) : (
          <SavingsTable
            groups={groups}
            deleteAction={deleteAction}
            bulkDeleteAction={bulkDeleteAction}
            totalLabel={totalLabel}
            total={total}
            onEdit={(saving) => {
              setEditingSaving({
                id: saving.id,
                description: saving.description,
                amount: saving.amount,
                date: saving.date,
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
