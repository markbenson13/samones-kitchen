"use client";

import { useId, useState } from "react";

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
}: {
  action: (formData: FormData) => void | Promise<void>;
  items: FoodItemOption[];
  categories: string[];
}) {
  const nameListId = useId();
  const categoryListId = useId();
  const [fields, setFields] = useState(emptyState);

  function handleNameChange(value: string) {
    const match = items.find(
      (item) => item.name.toLowerCase() === value.toLowerCase()
    );
    setFields({
      id: match?.id ?? "",
      name: value,
      category: match ? (match.category ?? "") : fields.category,
      costPrice: match ? match.costPrice : fields.costPrice,
      sellingPrice: match ? match.sellingPrice : fields.sellingPrice,
    });
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
        <input
          name="name"
          type="text"
          list={nameListId}
          required
          autoComplete="off"
          placeholder="e.g. Adobo"
          value={fields.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
        <datalist id={nameListId}>
          {items.map((item) => (
            <option key={item.id} value={item.name} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Category
        </label>
        <input
          name="category"
          type="text"
          list={categoryListId}
          autoComplete="off"
          placeholder="Optional"
          value={fields.category}
          onChange={(e) => setFields({ ...fields, category: e.target.value })}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
        <datalist id={categoryListId}>
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
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
        <button
          type="submit"
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
        >
          {fields.id ? "Update item" : "Add item"}
        </button>
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
