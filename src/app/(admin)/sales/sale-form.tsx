"use client";

import { useState } from "react";

type FoodItemOption = { id: string; name: string; sellingPrice: string };

export function SaleForm({
  action,
  foodItems,
  defaultDate,
}: {
  action: (formData: FormData) => void | Promise<void>;
  foodItems: FoodItemOption[];
  defaultDate: string;
}) {
  const [foodItemId, setFoodItemId] = useState(foodItems[0]?.id ?? "");
  const [unitPrice, setUnitPrice] = useState(foodItems[0]?.sellingPrice ?? "");

  function handleFoodItemChange(id: string) {
    setFoodItemId(id);
    const item = foodItems.find((f) => f.id === id);
    if (item) setUnitPrice(item.sellingPrice);
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
          {foodItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
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
          defaultValue={defaultDate}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-end lg:col-span-5">
        <button
          type="submit"
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
        >
          Record sale
        </button>
      </div>
    </form>
  );
}
