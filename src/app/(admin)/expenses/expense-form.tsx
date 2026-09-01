"use client";

import { useEffect, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

export type EditingExpense = {
  id: string;
  description: string;
  amount: string;
  date: string;
};

export function ExpenseForm({
  action,
  defaultDate,
  editingExpense,
  onCancelEdit,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultDate: string;
  editingExpense?: EditingExpense | null;
  onCancelEdit?: () => void;
}) {
  const [id, setId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate);
  // Brief confirmation after a successful submit — otherwise the form gives
  // no visible sign it worked, making it easy to think a click didn't
  // register and submit the same expense twice.
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  // Seeded with null (not `editingExpense`) so this still syncs correctly
  // the first time this component renders, since it only mounts once its
  // collapsible section is expanded — which can happen already mid-edit.
  const [syncedEditingExpense, setSyncedEditingExpense] =
    useState<EditingExpense | null>(null);
  if (editingExpense && editingExpense !== syncedEditingExpense) {
    setSyncedEditingExpense(editingExpense);
    setId(editingExpense.id);
    setDescription(editingExpense.description);
    setAmount(editingExpense.amount);
    setDate(editingExpense.date);
  }

  function resetForm() {
    setId("");
    setDescription("");
    setAmount("");
    setDate(defaultDate);
    onCancelEdit?.();
  }

  return (
    <form suppressHydrationWarning
      action={async (formData) => {
        await action(formData);
        resetForm();
        setJustSaved(true);
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
          placeholder="e.g. Gas, packaging, delivery fare"
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
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-end gap-2 lg:col-span-4">
        {id ? (
          <ConfirmSubmitButton
            pendingText="Updating…"
            confirmTitle="Save changes?"
            confirmMessage={`This will update "${description}".`}
            confirmLabel="Save changes"
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
          >
            Update expense
          </ConfirmSubmitButton>
        ) : (
          <SubmitButton
            pendingText="Adding…"
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
          >
            Add expense
          </SubmitButton>
        )}
        {id && (
          <button
            type="button"
            onClick={resetForm}
            className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
          >
            Cancel
          </button>
        )}
        {justSaved && (
          <span className="text-sm text-emerald-700">✓ Saved</span>
        )}
      </div>
    </form>
  );
}
