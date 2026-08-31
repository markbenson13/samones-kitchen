"use client";

import { useEffect, useMemo, useState } from "react";
import { utcDateKey } from "@/lib/date";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

type FoodItemOption = { id: string; name: string; sellingPrice: string };

export type EditingSale = {
  id: string;
  foodItemId: string;
  quantityMade: number;
  quantity: number;
  unitPrice: string;
  isSale: boolean;
  date: string;
};

export function SaleForm({
  action,
  menuByDate,
  allFoodItems,
  defaultDate,
  leftoverByKey,
  editingSale,
  onCancelEdit,
}: {
  action: (formData: FormData) => void | Promise<void>;
  menuByDate: Record<string, FoodItemOption[]>;
  allFoodItems: FoodItemOption[];
  defaultDate: string;
  leftoverByKey: Record<string, number>;
  editingSale?: EditingSale | null;
  onCancelEdit?: () => void;
}) {
  const [date, setDate] = useState(defaultDate);

  const options = useMemo(() => {
    const key = utcDateKey(new Date(date));
    return menuByDate[key] ?? allFoodItems;
  }, [date, menuByDate, allFoodItems]);
  const hasMenuForDay = !!menuByDate[utcDateKey(new Date(date))];

  const [id, setId] = useState("");
  const [foodItemId, setFoodItemId] = useState(options[0]?.id ?? "");
  const [unitPrice, setUnitPrice] = useState(options[0]?.sellingPrice ?? "");
  const [quantityMade, setQuantityMade] = useState("");
  const [quantity, setQuantity] = useState("");
  // Price is only editable once "Sale" is checked — otherwise it's locked to
  // the item's normal selling price.
  const [isSale, setIsSale] = useState(false);
  // Brief confirmation after a successful submit — the form otherwise gives
  // no visible sign it worked, which made it easy to think a click hadn't
  // registered and submit the same sale again.
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  // Load the selected row into the form when an edit is requested.
  const [syncedEditingSale, setSyncedEditingSale] = useState(editingSale);
  if (editingSale && editingSale !== syncedEditingSale) {
    setSyncedEditingSale(editingSale);
    setId(editingSale.id);
    setFoodItemId(editingSale.foodItemId);
    setUnitPrice(editingSale.unitPrice);
    setQuantityMade(String(editingSale.quantityMade));
    setQuantity(String(editingSale.quantity));
    setIsSale(editingSale.isSale);
    setDate(editingSale.date);
  }

  // Only prefills for a brand-new entry — editing an existing row leaves
  // Tubs made alone so it doesn't get clobbered mid-edit.
  function applyLeftoverPrefill(nextFoodItemId: string, nextDate: string) {
    if (id) return;
    const key = `${utcDateKey(new Date(nextDate))}_${nextFoodItemId}`;
    const leftover = leftoverByKey[key];
    if (leftover !== undefined) setQuantityMade(String(leftover));
  }

  function handleFoodItemChange(newFoodItemId: string) {
    setFoodItemId(newFoodItemId);
    const item = options.find((f) => f.id === newFoodItemId);
    if (item && !isSale) setUnitPrice(item.sellingPrice);
    if (isSale) applyLeftoverPrefill(newFoodItemId, date);
  }

  function handleSaleToggle(checked: boolean) {
    setIsSale(checked);
    if (checked) {
      applyLeftoverPrefill(foodItemId, date);
    } else {
      const item = options.find((f) => f.id === foodItemId);
      setUnitPrice(item?.sellingPrice ?? "");
    }
  }

  function handleDateChange(value: string) {
    setDate(value);
    const key = utcDateKey(new Date(value));
    const nextOptions = menuByDate[key] ?? allFoodItems;
    if (!nextOptions.some((item) => item.id === foodItemId)) {
      setFoodItemId(nextOptions[0]?.id ?? "");
      setUnitPrice(nextOptions[0]?.sellingPrice ?? "");
      if (isSale) applyLeftoverPrefill(nextOptions[0]?.id ?? "", value);
    } else if (isSale) {
      applyLeftoverPrefill(foodItemId, value);
    }
  }

  function resetForm() {
    setId("");
    setFoodItemId(options[0]?.id ?? "");
    setUnitPrice(options[0]?.sellingPrice ?? "");
    setQuantityMade("");
    setQuantity("");
    setIsSale(false);
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
      className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6"
    >
      <input type="hidden" name="id" value={id} />
      <div className="lg:col-span-2">
        <label className="block text-xs font-medium text-brand-brown-light">
          Food item
        </label>
        <select
          name="foodItemId"
          required
          value={foodItemId}
          onChange={(e) => handleFoodItemChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        >
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-brand-brown-light">
          {hasMenuForDay
            ? "Showing this day's menu."
            : "No menu set for this day yet — showing all active items."}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Tubs made
        </label>
        <input
          name="quantityMade"
          type="number"
          step="1"
          min="1"
          required
          value={quantityMade}
          onChange={(e) => setQuantityMade(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Sold
        </label>
        <input
          name="quantity"
          type="number"
          step="1"
          min="0"
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="flex items-center justify-between text-xs font-medium text-brand-brown-light">
          Unit price
          <span className="flex items-center gap-1 font-normal">
            <input
              type="checkbox"
              name="isSale"
              checked={isSale}
              onChange={(e) => handleSaleToggle(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-brand-tan text-brand-gold focus:ring-brand-gold"
            />
            Sale
          </span>
        </label>
        <input
          name="unitPrice"
          type="number"
          step="0.01"
          min="0"
          required
          disabled={!isSale}
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm disabled:bg-brand-cream disabled:text-brand-brown-light"
          title={isSale ? "Sale price" : 'Check "Sale" to lower this item\'s price'}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Date
        </label>
        <input
          name="date"
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-end gap-2 lg:col-span-6">
        {id ? (
          <ConfirmSubmitButton
            pendingText="Updating…"
            confirmTitle="Save changes?"
            confirmMessage={`This will update the sale record for "${options.find((item) => item.id === foodItemId)?.name ?? "this item"}".`}
            confirmLabel="Save changes"
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
          >
            Update sale
          </ConfirmSubmitButton>
        ) : (
          <SubmitButton
            pendingText="Recording…"
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
          >
            Record sale
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
