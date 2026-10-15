"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { useToast, withToast } from "@/components/toast";
import { SAVING_TYPES } from "@/lib/saving-types";

export type EditingSaving = {
  id: string;
  description: string;
  amount: string;
  type: string;
  date: string;
};

export function SavingForm({
  action,
  defaultDate,
  editingSaving,
  onCancelEdit,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultDate: string;
  editingSaving?: EditingSaving | null;
  onCancelEdit?: () => void;
}) {
  const [id, setId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<string>(SAVING_TYPES[0]);
  const [date, setDate] = useState(defaultDate);
  const toast = useToast();

  // Seeded with null (not `editingSaving`) so this still syncs correctly the
  // first time this component renders, since it only mounts once its
  // collapsible section is expanded — which can happen already mid-edit.
  const [syncedEditingSaving, setSyncedEditingSaving] =
    useState<EditingSaving | null>(null);
  if (editingSaving && editingSaving !== syncedEditingSaving) {
    setSyncedEditingSaving(editingSaving);
    setId(editingSaving.id);
    setDescription(editingSaving.description);
    setAmount(editingSaving.amount);
    setType(editingSaving.type);
    setDate(editingSaving.date);
  }

  function resetForm() {
    setId("");
    setDescription("");
    setAmount("");
    setType(SAVING_TYPES[0]);
    setDate(defaultDate);
    onCancelEdit?.();
  }

  return (
    <form suppressHydrationWarning
      action={async (formData) => {
        const isEdit = Boolean(id);
        const ok = await withToast(
          toast,
          () => action(formData),
          isEdit
            ? `"${description}" updated.`
            : type === "Withdrawal"
              ? `"${description}" withdrawn from savings.`
              : `"${description}" added to savings.`
        );
        if (ok) resetForm();
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <input suppressHydrationWarning type="hidden" name="id" value={id} />
      <div className="lg:col-span-2">
        <label className="block text-xs font-medium text-brand-brown-light">
          Note
        </label>
        <input suppressHydrationWarning
          name="description"
          type="text"
          required
          placeholder="e.g. From wife, extra from Sales"
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
      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Type
        </label>
        <select suppressHydrationWarning
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        >
          {SAVING_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
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
            Update entry
          </ConfirmSubmitButton>
        ) : (
          <SubmitButton
            pendingText={type === "Withdrawal" ? "Withdrawing…" : "Adding…"}
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
          >
            {type === "Withdrawal" ? "Withdraw from savings" : "Add to savings"}
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
      </div>
    </form>
  );
}
