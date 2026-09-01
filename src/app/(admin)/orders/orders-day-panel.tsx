"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CollapsibleSection } from "@/components/collapsible-section";
import { useReportNavigationStart } from "@/components/nav-progress";
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
  defaultDate,
}: {
  addMenuAction: (formData: FormData) => void | Promise<void>;
  removeMenuAction: (id: string) => void | Promise<void>;
  menuByDateForManager: Record<string, (MenuItem & { dailyMenuId: string })[]>;
  createOrderAction: (formData: FormData) => void | Promise<void>;
  menuByDateForOrder: Record<string, OrderMenuItem[]>;
  allFoodItems: OrderMenuItem[];
  allFoodItemNames: string[];
  defaultDate: string;
}) {
  const [date, setDate] = useState(defaultDate);
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportNavStart = useReportNavigationStart();

  // The orders table below is server-rendered and only shows this one day,
  // so changing it here needs to update the URL — not just this component's
  // own state — to trigger a refetch. Payment/delivery filters carry over.
  // router.push isn't a click on an <a>, so the app-wide nav progress
  // tracker's click listener can't see it — report it explicitly.
  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", nextDate);
    reportNavStart();
    router.push(`/orders?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-brand-brown-light">
          Managing day
        </label>
        <input suppressHydrationWarning
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
        <p className="text-xs text-brand-brown-light">
          Sets the menu you&apos;re editing below, the day new orders are
          recorded for, and which day&apos;s orders are shown below.
        </p>
      </div>

      <DailyMenuManager
        addAction={addMenuAction}
        removeAction={removeMenuAction}
        menuByDate={menuByDateForManager}
        allFoodItemNames={allFoodItemNames}
        date={date}
      />

      <CollapsibleSection title="Add order" defaultOpen={false}>
        {allFoodItems.length === 0 ? (
          <p className="text-sm text-brand-brown-light">
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
      </CollapsibleSection>
    </div>
  );
}
