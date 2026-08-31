"use client";

import { useMemo } from "react";
import { utcDateKey } from "@/lib/date";

type FoodItemOption = { id: string; name: string };

const PAYMENT_MODES = ["Cash", "GCash", "Both"];

export function OrderForm({
  action,
  menuByDate,
  allFoodItems,
  date,
}: {
  action: (formData: FormData) => void | Promise<void>;
  menuByDate: Record<string, FoodItemOption[]>;
  allFoodItems: FoodItemOption[];
  date: string;
}) {
  const options = useMemo(() => {
    const key = utcDateKey(new Date(date));
    return menuByDate[key] ?? allFoodItems;
  }, [date, menuByDate, allFoodItems]);

  const hasMenuForDay = !!menuByDate[utcDateKey(new Date(date))];

  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="date" value={date} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Order (check one or more)
        </label>
        <p className="mt-1 text-xs text-brand-brown-light">
          {hasMenuForDay
            ? "Showing this day's menu."
            : "No menu set for this day yet — showing all active items."}
        </p>
        <div className="mt-2 max-h-64 divide-y divide-brand-tan/60 overflow-y-auto rounded-md border border-brand-tan">
          {options.map((item) => (
            <label
              key={item.id}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="foodItemIds"
                  value={item.id}
                  className="h-4 w-4 rounded border-brand-tan text-brand-red focus:ring-brand-red"
                />
                <span className="text-brand-brown">{item.name}</span>
              </span>
              <input
                type="number"
                name={`quantity_${item.id}`}
                min="1"
                step="1"
                defaultValue={1}
                className="w-20 rounded-md border border-brand-tan px-2 py-1 text-sm"
              />
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
      >
        Add order
      </button>
    </form>
  );
}
