"use client";

import { useState } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { DailyMenuManager } from "./daily-menu-manager";
import { OrderForm } from "./order-form";

type MenuItem = { id: string; name: string };
type OrderMenuItem = MenuItem & { sellingPrice: string };

export function OrdersDayPanel({
  addMenuAction,
  removeMenuAction,
  menuByDateForManager,
  createOrderAction,
  menuByDateForOrder,
  allFoodItems,
  allFoodItemNames,
  allCustomerNames,
  defaultDate,
}: {
  addMenuAction: (formData: FormData) => void | Promise<void>;
  removeMenuAction: (id: string) => void | Promise<void>;
  menuByDateForManager: Record<string, (MenuItem & { dailyMenuId: string })[]>;
  createOrderAction: (formData: FormData) => void | Promise<void>;
  menuByDateForOrder: Record<string, OrderMenuItem[]>;
  allFoodItems: OrderMenuItem[];
  allFoodItemNames: string[];
  allCustomerNames: string[];
  defaultDate: string;
}) {
  const [date, setDate] = useState(defaultDate);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-brand-brown-light">
          Managing day
        </label>
        <input suppressHydrationWarning
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

      <CollapsibleSection title="Add order">
        {allFoodItems.length === 0 ? (
          <p className="text-sm text-brand-brown-light">
            Add a dish to a day&apos;s menu above before recording an order.
          </p>
        ) : (
          <OrderForm
            action={createOrderAction}
            menuByDate={menuByDateForOrder}
            allFoodItems={allFoodItems}
            allCustomerNames={allCustomerNames}
            date={date}
          />
        )}
      </CollapsibleSection>
    </div>
  );
}
