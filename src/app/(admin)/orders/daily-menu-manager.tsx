"use client";

import { useState } from "react";
import { Combobox } from "@/components/combobox";
import { CollapsibleSection } from "@/components/collapsible-section";
import { SubmitButton } from "@/components/submit-button";
import { utcDateKey } from "@/lib/date";

type MenuItem = { id: string; name: string };

export function DailyMenuManager({
  addAction,
  removeAction,
  menuByDate,
  allFoodItemNames,
  date,
}: {
  addAction: (formData: FormData) => void | Promise<void>;
  removeAction: (id: string) => void | Promise<void>;
  menuByDate: Record<string, (MenuItem & { dailyMenuId: string })[]>;
  allFoodItemNames: string[];
  date: string;
}) {
  const [name, setName] = useState("");

  const todaysMenu = menuByDate[utcDateKey(new Date(date))] ?? [];

  return (
    <CollapsibleSection
      title="Set the menu for a day"
      description="Add a dish to a day's menu — type a new name and it creates the food item on the spot (cost/selling price default to ₱0, fix those up on the Food Items page). No need to log a sale or market cost first."
      defaultOpen={false}
      collapsedSummary={
        todaysMenu.length === 0 ? (
          "Nothing set for this day yet."
        ) : (
          <span className="flex flex-wrap gap-1.5">
            {todaysMenu.map((item) => (
              <span
                key={item.dailyMenuId}
                className="rounded-full bg-brand-cream px-2 py-0.5 text-brand-brown"
              >
                {item.name}
              </span>
            ))}
          </span>
        )
      }
    >
      <form suppressHydrationWarning
        action={(formData) => {
          addAction(formData);
          setName("");
        }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input suppressHydrationWarning type="hidden" name="date" value={date} />
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-brand-brown-light">
            Dish name
          </label>
          <Combobox
            name="name"
            required
            placeholder="e.g. Adobo"
            value={name}
            onChange={setName}
            options={allFoodItemNames}
          />
        </div>
        <div className="flex items-end">
          <SubmitButton
            pendingText="Adding…"
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
          >
            Add to menu
          </SubmitButton>
        </div>
      </form>

      <div className="mt-4">
        {todaysMenu.length === 0 ? (
          <p className="text-sm text-brand-brown-light">
            Nothing set for this day yet.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {todaysMenu.map((item) => (
              <li
                key={item.dailyMenuId}
                className="flex items-center gap-2 rounded-full bg-brand-cream px-3 py-1 text-sm text-brand-brown"
              >
                {item.name}
                <form suppressHydrationWarning action={removeAction.bind(null, item.dailyMenuId)}>
                  <SubmitButton
                    spinnerClassName="h-2.5 w-2.5"
                    aria-label={`Remove ${item.name} from this day's menu`}
                    className="text-brand-brown-light hover:text-brand-red"
                  >
                    ×
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CollapsibleSection>
  );
}
