"use client";

import { useMemo, useState } from "react";
import { utcDateKey } from "@/lib/date";

type FoodItemOption = { id: string; name: string };

const PAYMENT_MODES = ["Cash", "GCash", "Both"];

export function OrderForm({
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

  const [foodItemId, setFoodItemId] = useState(options[0]?.id ?? "");

  function handleDateChange(value: string) {
    setDate(value);
    const key = utcDateKey(new Date(value));
    const nextOptions = menuByDate[key] ?? allFoodItems;
    if (!nextOptions.some((item) => item.id === foodItemId)) {
      setFoodItemId(nextOptions[0]?.id ?? "");
    }
  }

  return (
    <form
      action={action}
      className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="lg:col-span-2">
        <label className="block text-xs font-medium text-brand-brown-light">
          Customer name / unit
        </label>
        <input
          name="customerName"
          type="text"
          required
          placeholder="e.g. Juan Dela Cruz / Unit 4B"
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
      </div>
      <div className="lg:col-span-2">
        <label className="block text-xs font-medium text-brand-brown-light">
          Order
        </label>
        <select
          name="foodItemId"
          required
          value={foodItemId}
          onChange={(e) => setFoodItemId(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        >
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-brand-brown-light">
          {menuByDate[utcDateKey(new Date(date))]
            ? "Showing what was sold that day."
            : "No sales recorded that day yet — showing all active items."}
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
          Payment status
        </label>
        <select
          name="paymentStatus"
          defaultValue="Unpaid"
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        >
          <option value="Unpaid">Unpaid</option>
          <option value="Paid">Paid</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Delivery status
        </label>
        <select
          name="deliveryStatus"
          defaultValue="Pending"
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        >
          <option value="Pending">Pending</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Mode of payment
        </label>
        <select
          name="paymentMode"
          defaultValue="Cash"
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        >
          {PAYMENT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
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
      <div className="flex items-end lg:col-span-4">
        <button
          type="submit"
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
        >
          Add order
        </button>
      </div>
    </form>
  );
}
