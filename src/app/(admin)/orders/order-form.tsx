"use client";

import { useMemo, useState } from "react";
import { utcDateKey } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { SubmitButton } from "@/components/submit-button";
import { Combobox } from "@/components/combobox";
import { useToast, withToast } from "@/components/toast";
import { BUILDINGS, buildingCode } from "./building-codes";

type FoodItemOption = { id: string; name: string; sellingPrice: string };

const PAYMENT_MODES = ["Cash", "GCash", "Both"];

type ItemDraft = { checked: boolean; quantity: number; isSale: boolean; price: number };

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

  // Customer identity is building + unit number (e.g. "PA-1234" for Prisma
  // tower's Astra building) — the tower+building code is combined with the
  // unit number on submit, so the customer doesn't have to type it
  // themselves.
  const [building, setBuilding] = useState("Amina");
  const [unitNumber, setUnitNumber] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [search, setSearch] = useState("");
  const filteredOptions = useMemo(
    () =>
      options.filter((item) =>
        item.name.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [options, search]
  );

  // One record per item, independent of whether its row is currently
  // mounted. An uncontrolled checkbox/input (the previous approach, read via
  // refs) loses its value entirely when its row unmounts — which happens
  // every time the search box filters it out and back in — silently
  // desyncing the Total from whatever was visibly checked. Keeping
  // everything in state instead means a row can come and go with the search
  // filter without losing (or double-counting) anything.
  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraft>>({});
  const toast = useToast();

  function draftFor(item: FoodItemOption): ItemDraft {
    return (
      itemDrafts[item.id] ?? {
        checked: false,
        quantity: 1,
        isSale: false,
        price: Number(item.sellingPrice),
      }
    );
  }

  function updateDraft(item: FoodItemOption, patch: Partial<ItemDraft>) {
    setItemDrafts((prev) => ({
      ...prev,
      [item.id]: { ...draftFor(item), ...patch },
    }));
  }

  function handleCheckedChange(item: FoodItemOption, checked: boolean) {
    updateDraft(item, { checked });
  }

  function handleSaleToggle(item: FoodItemOption, checked: boolean) {
    updateDraft(item, {
      isSale: checked,
      // Resetting back to the item's normal price when "Sale" is
      // unchecked — matches it being locked/disabled whenever not a Sale.
      price: checked ? draftFor(item).price : Number(item.sellingPrice),
    });
  }

  function handleQuantityChange(item: FoodItemOption, quantity: number) {
    updateDraft(item, { quantity });
  }

  function handlePriceChange(item: FoodItemOption, price: number) {
    updateDraft(item, { price });
  }

  const total = options.reduce((sum, item) => {
    const draft = itemDrafts[item.id];
    return draft?.checked ? sum + draft.quantity * draft.price : sum;
  }, 0);

  return (
    <form suppressHydrationWarning
      action={async (formData) => {
        const customerName = `${buildingCode(building)}-${unitNumber.trim()}`;
        formData.set("customerName", customerName);
        const ok = await withToast(
          toast,
          () => action(formData),
          `Order added for ${customerName}.`
        );
        if (ok) {
          setBuilding("Amina");
          setUnitNumber("");
          setDeliveryNote("");
          setItemDrafts({});
          setSearch("");
        }
      }}
      className="mt-4 space-y-4"
    >
      <input suppressHydrationWarning type="hidden" name="date" value={date} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Building
          </label>
          <div className="mt-1">
            <Combobox
              name="building"
              required
              placeholder="e.g. Amina"
              value={building}
              onChange={setBuilding}
              options={BUILDINGS}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Unit number
          </label>
          <input suppressHydrationWarning
            type="text"
            required
            placeholder="e.g. 1234"
            value={unitNumber}
            onChange={(e) => setUnitNumber(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Payment status
          </label>
          <select suppressHydrationWarning
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
          <select suppressHydrationWarning
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
          <select suppressHydrationWarning
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
            Delivery note
          </label>
          <input suppressHydrationWarning
            type="text"
            name="deliveryNote"
            placeholder="e.g. Deliver at 1pm, lobby meetup"
            value={deliveryNote}
            onChange={(e) => setDeliveryNote(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Order (check one or more)
        </label>
        {hasMenuForDay ? (
          <p className="mt-1 text-xs text-brand-brown-light">
            Showing this day&apos;s menu.
          </p>
        ) : (
          <p className="mt-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
            ⚠ No menu set for this day — showing every active item. Set a
            menu above if this day should be limited.
          </p>
        )}
        <input suppressHydrationWarning
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          className="mt-2 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
        <div className="mt-2 max-h-64 divide-y divide-brand-tan/60 overflow-y-auto rounded-md border border-brand-tan">
          {filteredOptions.map((item) => {
            const draft = draftFor(item);
            return (
            <label
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm ${
                draft.isSale ? "bg-brand-gold/10" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                <input suppressHydrationWarning
                  type="checkbox"
                  name="foodItemIds"
                  value={item.id}
                  checked={draft.checked}
                  onChange={(e) => handleCheckedChange(item, e.target.checked)}
                  className="h-4 w-4 rounded border-brand-tan text-brand-red focus:ring-brand-red"
                />
                <span className="text-brand-brown">{item.name}</span>
              </span>
              {/* Wraps onto its own full-width line below the checkbox/name
                  on a narrow phone — the stepper + Sale checkbox + price
                  input together don't fit beside a long item name at 320px,
                  and without this they'd silently overflow off-screen with
                  no way to reach them (no horizontal scroll on this list). */}
              <span className="flex w-full flex-wrap items-center gap-2 pl-6 sm:w-auto sm:flex-nowrap sm:pl-0">
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Decrease quantity for ${item.name}`}
                    onClick={() => handleQuantityChange(item, Math.max(1, draft.quantity - 1))}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-brand-tan text-brand-brown hover:bg-brand-cream"
                  >
                    −
                  </button>
                  <input suppressHydrationWarning
                    type="number"
                    name={`quantity_${item.id}`}
                    min="1"
                    step="1"
                    value={draft.quantity}
                    onChange={(e) =>
                      handleQuantityChange(item, Number(e.target.value) || 1)
                    }
                    className="w-12 rounded-md border border-brand-tan px-1 py-1 text-center text-sm"
                    title="Quantity"
                  />
                  <button
                    type="button"
                    aria-label={`Increase quantity for ${item.name}`}
                    onClick={() => handleQuantityChange(item, draft.quantity + 1)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-brand-tan text-brand-brown hover:bg-brand-cream"
                  >
                    +
                  </button>
                </span>
                <label
                  className="flex items-center gap-1 text-[11px] text-brand-brown-light"
                  title="Check to sell this item at a discounted price"
                >
                  <input suppressHydrationWarning
                    type="checkbox"
                    name={`sale_${item.id}`}
                    checked={draft.isSale}
                    onChange={(e) => handleSaleToggle(item, e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-brand-tan text-brand-gold focus:ring-brand-gold"
                  />
                  Sale
                </label>
                <input suppressHydrationWarning
                  type="number"
                  name={`price_${item.id}`}
                  min="0"
                  step="0.01"
                  value={draft.price}
                  disabled={!draft.isSale}
                  onChange={(e) =>
                    handlePriceChange(item, Number(e.target.value) || 0)
                  }
                  className="w-24 rounded-md border border-brand-tan px-2 py-1 text-sm disabled:bg-brand-cream disabled:text-brand-brown-light"
                  title={
                    draft.isSale
                      ? "Sale price for this order"
                      : "Check \"Sale\" to lower this item's price for this order"
                  }
                />
              </span>
            </label>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-brand-brown-light">
          Check &quot;Sale&quot; next to an item to lower its price for this
          order — the item&apos;s own selling price is unaffected, and a
          &quot;Sale&quot; badge marks the order as sold at a discount.
        </p>
        <p className="mt-2 text-right text-sm font-medium text-brand-brown">
          Total: {formatMoney(total)}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton
          pendingText="Adding order…"
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
        >
          Add order
        </SubmitButton>
      </div>
    </form>
  );
}
