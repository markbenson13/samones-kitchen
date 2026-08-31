"use client";

import { useState } from "react";
import { DailyMenuManager } from "./daily-menu-manager";
import { OrderForm } from "./order-form";

type MenuItem = { id: string; name: string };

export function OrdersDayPanel({
  addMenuAction,
  removeMenuAction,
  menuByDateForManager,
  createOrderAction,
  menuByDateForOrder,
  allFoodItems,
  allFoodItemNames,
  defaultDate,
}: {
  addMenuAction: (formData: FormData) => void | Promise<void>;
  removeMenuAction: (id: string) => void | Promise<void>;
  menuByDateForManager: Record<string, (MenuItem & { dailyMenuId: string })[]>;
  createOrderAction: (formData: FormData) => void | Promise<void>;
  menuByDateForOrder: Record<string, MenuItem[]>;
  allFoodItems: MenuItem[];
  allFoodItemNames: string[];
  defaultDate: string;
}) {
  const [date, setDate] = useState(defaultDate);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-brand-brown-light">
          Managing day
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
        <p className="text-xs text-brand-brown-light">
          Sets both the menu you&apos;re editing below and the day new orders
          are recorded for.
        </p>
      </div>

      <DailyMenuManager
        addAction={addMenuAction}
        removeAction={removeMenuAction}
        menuByDate={menuByDateForManager}
        allFoodItemNames={allFoodItemNames}
        date={date}
      />

      <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-brand-brown">Add order</h2>
        {allFoodItems.length === 0 ? (
          <p className="mt-4 text-sm text-brand-brown-light">
            Add a dish to a day&apos;s menu above before recording an order.
          </p>
        ) : (
          <OrderForm
            action={createOrderAction}
            menuByDate={menuByDateForOrder}
            allFoodItems={allFoodItems}
            date={date}
          />
        )}
      </section>
    </div>
  );
}
