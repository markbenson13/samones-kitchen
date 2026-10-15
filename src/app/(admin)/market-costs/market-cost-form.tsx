"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { useToast, withToast } from "@/components/toast";

export type EditingCost = {
  id: string;
  description: string;
  amount: string;
  date: string;
};

type Row = { description: string; amount: string };
const emptyRow: Row = { description: "", amount: "" };

export function MarketCostForm({
  action,
  createAction,
  defaultDate,
  editingCost,
  onCancelEdit,
}: {
  action: (formData: FormData) => void | Promise<void>;
  // Handles one or more brand-new rows from one market trip in a single
  // submission — separate from `action` (upsertMarketCost), which only ever
  // edits the single existing row loaded into the form below.
  createAction: (formData: FormData) => void | Promise<void>;
  defaultDate: string;
  editingCost?: EditingCost | null;
  onCancelEdit?: () => void;
}) {
  // ---- Editing one existing cost — unchanged single-row behavior ----
  const [id, setId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [editDate, setEditDate] = useState(defaultDate);

  // ---- Adding new costs — one or more rows from the same market trip ----
  const [rows, setRows] = useState<Row[]>([{ ...emptyRow }]);
  const [addDate, setAddDate] = useState(defaultDate);
  const toast = useToast();

  // Seeded with null (not `editingCost`) so this still syncs correctly the
  // first time this component renders, since it only mounts once its
  // collapsible section is expanded — which can happen already mid-edit.
  const [syncedEditingCost, setSyncedEditingCost] =
    useState<EditingCost | null>(null);
  if (editingCost && editingCost !== syncedEditingCost) {
    setSyncedEditingCost(editingCost);
    setId(editingCost.id);
    setDescription(editingCost.description);
    setAmount(editingCost.amount);
    setEditDate(editingCost.date);
  }

  function resetEditForm() {
    setId("");
    setDescription("");
    setAmount("");
    setEditDate(defaultDate);
    onCancelEdit?.();
  }

  function resetAddForm() {
    setRows([{ ...emptyRow }]);
    setAddDate(defaultDate);
    onCancelEdit?.();
  }

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { ...emptyRow }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  if (editingCost) {
    return (
      <form suppressHydrationWarning
        action={async (formData) => {
          const ok = await withToast(
            toast,
            () => action(formData),
            `"${description}" updated.`
          );
          if (ok) resetEditForm();
        }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input suppressHydrationWarning type="hidden" name="id" value={id} />
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-brand-brown-light">
            Description
          </label>
          <input suppressHydrationWarning
            name="description"
            type="text"
            required
            placeholder="e.g. Chicken, vegetables"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Amount
          </label>
          <input suppressHydrationWarning
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Date
          </label>
          <input suppressHydrationWarning
            name="date"
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-end gap-2 lg:col-span-4">
          <ConfirmSubmitButton
            pendingText="Updating…"
            confirmTitle="Save changes?"
            confirmMessage={`This will update "${description}".`}
            confirmLabel="Save changes"
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
          >
            Update cost
          </ConfirmSubmitButton>
          <button
            type="button"
            onClick={resetEditForm}
            className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <form suppressHydrationWarning
      action={async (formData) => {
        const count = rows.length;
        const ok = await withToast(
          toast,
          () => createAction(formData),
          `${count} market cost${count === 1 ? "" : "s"} added.`
        );
        if (ok) resetAddForm();
      }}
      className="space-y-3"
    >
      <input suppressHydrationWarning type="hidden" name="rowCount" value={rows.length} />
      <div className="max-w-xs">
        <label className="block text-xs font-medium text-brand-brown-light">
          Date
        </label>
        <input suppressHydrationWarning
          name="date"
          type="date"
          value={addDate}
          onChange={(e) => setAddDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-brand-brown-light">
          Applies to every item below — log a whole market trip at once.
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          // Stacked full-width on mobile — a fixed w-32 Amount field plus a
          // Remove button don't leave enough room for Description to stay
          // usable on a narrow phone; flex-wrap alone doesn't help here
          // since flex-1 + min-w-0 lets it just shrink to near-nothing
          // instead of wrapping the row.
          <div
            key={i}
            className="flex flex-col gap-3 border-b border-brand-tan/60 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:flex-wrap sm:items-end sm:border-b-0 sm:pb-0"
          >
            <div className="w-full sm:min-w-0 sm:flex-1">
              {i === 0 && (
                <label className="block text-xs font-medium text-brand-brown-light">
                  Description
                </label>
              )}
              <input suppressHydrationWarning
                name={`description_${i}`}
                type="text"
                required
                placeholder="e.g. Chicken, vegetables"
                value={row.description}
                onChange={(e) => updateRow(i, "description", e.target.value)}
                className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
              />
            </div>
            <div className="w-full sm:w-32">
              {i === 0 && (
                <label className="block text-xs font-medium text-brand-brown-light">
                  Amount
                </label>
              )}
              <input suppressHydrationWarning
                name={`amount_${i}`}
                type="number"
                step="0.01"
                min="0"
                required
                value={row.amount}
                onChange={(e) => updateRow(i, "amount", e.target.value)}
                className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={rows.length === 1}
              className="self-start rounded-md border border-brand-tan px-3 py-2 text-xs font-medium text-brand-brown hover:bg-brand-cream disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
        >
          + Add another item
        </button>
        <SubmitButton
          pendingText="Adding…"
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
        >
          Add {rows.length} item{rows.length === 1 ? "" : "s"}
        </SubmitButton>
      </div>
    </form>
  );
}
