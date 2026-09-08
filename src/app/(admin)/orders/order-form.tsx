"use client";

import { useMemo, useRef, useState } from "react";
import { utcDateKey } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { SubmitButton } from "@/components/submit-button";
import { Combobox } from "@/components/combobox";
import { useToast, withToast } from "@/components/toast";

type FoodItemOption = { id: string; name: string; sellingPrice: string };

const PAYMENT_MODES = ["Cash", "GCash", "Both"];
const BUILDINGS = ["Amina", "Soraya", "Celeste", "Astra", "Kiran"];

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

  // Customer identity is building + unit number (e.g. "A-1234") — the
  // building's first letter is combined with the unit number on submit, so
  // the customer doesn't have to type the letter prefix themselves.
  const [building, setBuilding] = useState("Amina");
  const [unitNumber, setUnitNumber] = useState("");
  const [search, setSearch] = useState("");
  const filteredOptions = useMemo(
    () =>
      options.filter((item) =>
        item.name.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [options, search]
  );

  // Tracks checked item + quantity + price so the running total can be shown
  // live, without turning every checkbox/quantity/price input into a
  // controlled field.
  const [selections, setSelections] = useState<
    Record<string, { quantity: number; price: number }>
  >({});
  // Price is only editable once "Sale" is checked for that item — otherwise
  // it's locked to the item's normal selling price, so a price can't be
  // changed by accident.
  const [saleChecked, setSaleChecked] = useState<Record<string, boolean>>({});
  const toast = useToast();
  const quantityInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const priceInputs = useRef<Record<string, HTMLInputElement | null>>({});

  function handleCheckedChange(itemId: string, checked: boolean) {
    setSelections((prev) => {
      const next = { ...prev };
      if (checked) {
        const quantity = Number(quantityInputs.current[itemId]?.value) || 1;
        const price = Number(priceInputs.current[itemId]?.value) || 0;
        next[itemId] = { quantity, price };
      } else {
        delete next[itemId];
      }
      return next;
    });
  }

  function handleSaleToggle(itemId: string, checked: boolean, normalPrice: string) {
    setSaleChecked((prev) => ({ ...prev, [itemId]: checked }));
    if (!checked) {
      const input = priceInputs.current[itemId];
      if (input) input.value = normalPrice;
      handlePriceChange(itemId, Number(normalPrice) || 0);
    }
  }

  function handleQuantityChange(itemId: string, quantity: number) {
    setSelections((prev) =>
      itemId in prev ? { ...prev, [itemId]: { ...prev[itemId], quantity } } : prev
    );
  }

  function handlePriceChange(itemId: string, price: number) {
    setSelections((prev) =>
      itemId in prev ? { ...prev, [itemId]: { ...prev[itemId], price } } : prev
    );
  }

  const total = Object.values(selections).reduce(
    (sum, { quantity, price }) => sum + quantity * price,
    0
  );

  return (
    <form suppressHydrationWarning
      action={async (formData) => {
        const customerName = `${building.trim().charAt(0).toUpperCase()}-${unitNumber.trim()}`;
        formData.set("customerName", customerName);
        const ok = await withToast(
          toast,
          () => action(formData),
          `Order added for ${customerName}.`
        );
        if (ok) {
          setBuilding("Amina");
          setUnitNumber("");
          setSelections({});
          setSaleChecked({});
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
          {filteredOptions.map((item) => (
            <label
              key={item.id}
              className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${
                saleChecked[item.id] ? "bg-brand-gold/10" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                <input suppressHydrationWarning
                  type="checkbox"
                  name="foodItemIds"
                  value={item.id}
                  onChange={(e) => handleCheckedChange(item.id, e.target.checked)}
                  className="h-4 w-4 rounded border-brand-tan text-brand-red focus:ring-brand-red"
                />
                <span className="text-brand-brown">{item.name}</span>
              </span>
              <span className="flex items-center gap-2">
                <input suppressHydrationWarning
                  type="number"
                  name={`quantity_${item.id}`}
                  min="1"
                  step="1"
                  defaultValue={1}
                  ref={(el) => {
                    quantityInputs.current[item.id] = el;
                  }}
                  onChange={(e) =>
                    handleQuantityChange(item.id, Number(e.target.value) || 1)
                  }
                  className="w-16 rounded-md border border-brand-tan px-2 py-1 text-sm"
                  title="Quantity"
                />
                <label
                  className="flex items-center gap-1 text-[11px] text-brand-brown-light"
                  title="Check to sell this item at a discounted price"
                >
                  <input suppressHydrationWarning
                    type="checkbox"
                    name={`sale_${item.id}`}
                    checked={!!saleChecked[item.id]}
                    onChange={(e) =>
                      handleSaleToggle(item.id, e.target.checked, item.sellingPrice)
                    }
                    className="h-3.5 w-3.5 rounded border-brand-tan text-brand-gold focus:ring-brand-gold"
                  />
                  Sale
                </label>
                <input suppressHydrationWarning
                  type="number"
                  name={`price_${item.id}`}
                  min="0"
                  step="0.01"
                  defaultValue={item.sellingPrice}
                  disabled={!saleChecked[item.id]}
                  ref={(el) => {
                    priceInputs.current[item.id] = el;
                  }}
                  onChange={(e) =>
                    handlePriceChange(item.id, Number(e.target.value) || 0)
                  }
                  className="w-24 rounded-md border border-brand-tan px-2 py-1 text-sm disabled:bg-brand-cream disabled:text-brand-brown-light"
                  title={
                    saleChecked[item.id]
                      ? "Sale price for this order"
                      : "Check \"Sale\" to lower this item's price for this order"
                  }
                />
              </span>
            </label>
          ))}
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
