"use client";

import { useMemo, useState } from "react";
import { utcDateKey } from "@/lib/date";
import { SubmitButton } from "@/components/submit-button";

type FoodItemOption = { id: string; name: string; sellingPrice: string };

export function SaleForm({
  action,
  menuByDate,
  allFoodItems,
  defaultDate,
}: {
  action: (formData: FormData) => void | Promise<void>;
  menuByDate: Record<string, FoodItemOption[]>;
  allFoodItems: FoodItemOption[];
  defaultDate: string;
}) {
  const [date, setDate] = useState(defaultDate);

  const options = useMemo(() => {
    const key = utcDateKey(new Date(date));
    return menuByDate[key] ?? allFoodItems;
  }, [date, menuByDate, allFoodItems]);
  const hasMenuForDay = !!menuByDate[utcDateKey(new Date(date))];

  const [foodItemId, setFoodItemId] = useState(options[0]?.id ?? "");
  const [unitPrice, setUnitPrice] = useState(options[0]?.sellingPrice ?? "");

  function handleFoodItemChange(id: string) {
    setFoodItemId(id);
    const item = options.find((f) => f.id === id);
    if (item) setUnitPrice(item.sellingPrice);
  }

  function handleDateChange(value: string) {
    setDate(value);
    const key = utcDateKey(new Date(value));
    const nextOptions = menuByDate[key] ?? allFoodItems;
    if (!nextOptions.some((item) => item.id === foodItemId)) {
      setFoodItemId(nextOptions[0]?.id ?? "");
      setUnitPrice(nextOptions[0]?.sellingPrice ?? "");
    }
  }

  return (
    <form
      action={action}
      className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
    >
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
          Quantity
        </label>
        <input
          name="quantity"
          type="number"
          step="1"
          min="1"
          defaultValue={1}
          required
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Leftover
        </label>
        <input
          name="leftover"
          type="number"
          step="1"
          min="0"
          defaultValue={0}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Unit price
        </label>
        <input
          name="unitPrice"
          type="number"
          step="0.01"
          min="0"
          required
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
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

      <div className="flex items-end lg:col-span-5">
        <SubmitButton
          pendingText="Recording…"
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
        >
          Record sale
        </SubmitButton>
      </div>
    </form>
  );
}
