"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { useToast, withToast } from "@/components/toast";

type InventoryItem = {
  id: string;
  name: string;
  sellingPrice: number;
  stock: number;
};

type UntrackedFoodItem = { id: string; name: string };

function RestockForm({
  id,
  action,
}: {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [quantity, setQuantity] = useState("1");
  const toast = useToast();

  return (
    <form suppressHydrationWarning
      action={async (formData) => {
        const ok = await withToast(toast, () => action(formData), "Restocked.");
        if (ok) setQuantity("1");
      }}
      className="flex items-center gap-1.5"
    >
      <input suppressHydrationWarning type="hidden" name="id" value={id} />
      <input suppressHydrationWarning
        type="number"
        name="quantity"
        min="1"
        step="1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="w-16 rounded-md border border-brand-tan px-2 py-1 text-sm"
      />
      <SubmitButton
        spinnerClassName="h-3 w-3"
        className="rounded-md border border-brand-tan px-2.5 py-1 text-xs font-medium text-brand-brown hover:bg-brand-cream"
      >
        Restock
      </SubmitButton>
    </form>
  );
}

function SellForm({
  id,
  action,
}: {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [quantity, setQuantity] = useState("1");
  const toast = useToast();

  return (
    <form suppressHydrationWarning
      action={async (formData) => {
        const ok = await withToast(toast, () => action(formData), "Sale recorded.");
        if (ok) setQuantity("1");
      }}
      className="flex items-center gap-1.5"
    >
      <input suppressHydrationWarning type="hidden" name="id" value={id} />
      <input suppressHydrationWarning
        type="number"
        name="quantity"
        min="1"
        step="1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="w-16 rounded-md border border-brand-tan px-2 py-1 text-sm"
      />
      <SubmitButton
        spinnerClassName="h-3 w-3"
        className="rounded-md bg-brand-red px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-red-dark"
      >
        Sell
      </SubmitButton>
    </form>
  );
}

export function InventorySection({
  items,
  untracked,
  addAction,
  removeAction,
  restockAction,
  sellAction,
}: {
  items: InventoryItem[];
  untracked: UntrackedFoodItem[];
  addAction: (formData: FormData) => void | Promise<void>;
  removeAction: (id: string) => void | Promise<void>;
  restockAction: (formData: FormData) => void | Promise<void>;
  sellAction: (formData: FormData) => void | Promise<void>;
}) {
  const [foodItemId, setFoodItemId] = useState(untracked[0]?.id ?? "");
  const [initialStock, setInitialStock] = useState("0");
  const toast = useToast();

  return (
    <div className="space-y-6">
      {untracked.length > 0 && (
        <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-brand-brown">
            Add an item to inventory
          </h2>
          <form suppressHydrationWarning
            action={async (formData) => {
              const ok = await withToast(
                toast,
                () => addAction(formData),
                "Added to inventory."
              );
              if (ok) setInitialStock("0");
            }}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="block text-xs font-medium text-brand-brown-light">
                Food item
              </label>
              <select
                name="foodItemId"
                value={foodItemId}
                onChange={(e) => setFoodItemId(e.target.value)}
                className="mt-1 rounded-md border border-brand-tan px-3 py-2 text-sm"
              >
                {untracked.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-brown-light">
                Starting stock
              </label>
              <input suppressHydrationWarning
                type="number"
                name="initialStock"
                min="0"
                step="1"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="mt-1 w-24 rounded-md border border-brand-tan px-3 py-2 text-sm"
              />
            </div>
            <SubmitButton
              spinnerClassName="h-3 w-3"
              className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
            >
              Add
            </SubmitButton>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brand-brown-light">
            Nothing tracked yet — add an item above.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-cream text-xs uppercase text-brand-brown-light">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Restock</th>
                <th className="px-4 py-3">Sell</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-brand-tan">
                  <td className="px-4 py-3 font-medium text-brand-brown">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-brand-brown-light">
                    {formatMoney(item.sellingPrice)}
                  </td>
                  <td
                    className={`px-4 py-3 font-semibold ${
                      item.stock < 0
                        ? "text-red-600"
                        : item.stock === 0
                          ? "text-brand-brown-light"
                          : "text-brand-brown"
                    }`}
                  >
                    {item.stock}
                  </td>
                  <td className="px-4 py-3">
                    <RestockForm id={item.id} action={restockAction} />
                  </td>
                  <td className="px-4 py-3">
                    <SellForm id={item.id} action={sellAction} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form
                      suppressHydrationWarning
                      action={async () => {
                        await withToast(
                          toast,
                          () => removeAction(item.id),
                          `Stopped tracking ${item.name}.`
                        );
                      }}
                    >
                      <ConfirmSubmitButton
                        spinnerClassName="h-3 w-3"
                        confirmTitle="Stop tracking this item?"
                        confirmMessage={`This removes "${item.name}" from Inventory — its sales history is unaffected, and you can add it back later.`}
                        confirmLabel="Stop tracking"
                        danger
                        aria-label={`Stop tracking ${item.name}`}
                        className="text-brand-brown-light hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </ConfirmSubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
