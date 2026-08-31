"use client";

import { useState } from "react";
import { Combobox } from "@/components/combobox";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

type FoodItemOption = {
  id: string;
  name: string;
  category: string | null;
  costPrice: string;
  sellingPrice: string;
};

const emptyState = { id: "", name: "", category: "", costPrice: "", sellingPrice: "" };

export function FoodItemForm({
  action,
  items,
  categories,
  editingItem,
}: {
  action: (formData: FormData) => void | Promise<void>;
  items: FoodItemOption[];
  categories: string[];
  editingItem?: FoodItemOption | null;
}) {
  const [fields, setFields] = useState(emptyState);

  // Adjust local fields when a new item is selected for editing, without an
  // effect: https://react.dev/learn/you-might-not-need-an-effect
  const [syncedEditingItem, setSyncedEditingItem] = useState(editingItem);
  if (editingItem && editingItem !== syncedEditingItem) {
    setSyncedEditingItem(editingItem);
    setFields({
      id: editingItem.id,
      name: editingItem.name,
      category: editingItem.category ?? "",
      costPrice: editingItem.costPrice,
      sellingPrice: editingItem.sellingPrice,
    });
  }

  function handleNameChange(value: string) {
    const match = items.find(
      (item) => item.name.toLowerCase() === value.toLowerCase()
    );
    // Only switch id when the typed name matches another existing item.
    // Otherwise, keep whatever id was already loaded — typing to rename or
    // fix a typo on the item currently being edited must not silently fall
    // back to creating a new item.
    setFields((prev) => ({
      id: match ? match.id : prev.id,
      name: value,
      category: match ? (match.category ?? "") : prev.category,
      costPrice: match ? match.costPrice : prev.costPrice,
      sellingPrice: match ? match.sellingPrice : prev.sellingPrice,
    }));
  }

  async function handleAction(formData: FormData) {
    await action(formData);
    setFields(emptyState);
  }

  return (
    <form
      action={handleAction}
      className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <input type="hidden" name="id" value={fields.id} />

      <div className="lg:col-span-2">
        <label className="block text-xs font-medium text-brand-brown-light">
          Name
        </label>
        <div className="mt-1">
          <Combobox
            name="name"
            required
            placeholder="e.g. Adobo"
            value={fields.name}
            onChange={handleNameChange}
            options={items.map((item) => item.name)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Category
        </label>
        <div className="mt-1">
          <Combobox
            name="category"
            placeholder="Optional"
            value={fields.category}
            onChange={(value) => setFields({ ...fields, category: value })}
            options={categories}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Cost price
        </label>
        <input
          name="costPrice"
          type="number"
          step="0.01"
          min="0"
          required
          value={fields.costPrice}
          onChange={(e) => setFields({ ...fields, costPrice: e.target.value })}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Selling price
        </label>
        <input
          name="sellingPrice"
          type="number"
          step="0.01"
          min="0"
          required
          value={fields.sellingPrice}
          onChange={(e) =>
            setFields({ ...fields, sellingPrice: e.target.value })
          }
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-end gap-2 lg:col-span-5">
        {fields.id ? (
          <ConfirmSubmitButton
            pendingText="Updating…"
            confirmTitle="Save changes?"
            confirmMessage={`This will update "${fields.name}" with the values shown in this form.`}
            confirmLabel="Save changes"
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
          >
            Update item
          </ConfirmSubmitButton>
        ) : (
          <SubmitButton
            pendingText="Adding…"
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
          >
            Add item
          </SubmitButton>
        )}
        {fields.id && (
          <button
            type="button"
            onClick={() => setFields(emptyState)}
            className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
