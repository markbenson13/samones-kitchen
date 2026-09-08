"use client";

import { Fragment, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { BulkDeleteBar } from "@/components/bulk-delete-bar";
import { CollapsibleGroup } from "@/components/collapsible-group";
import {
  SortableHeader,
  nextSortState,
  compareValues,
  type SortState,
} from "@/components/sortable-header";
import { PaymentModeSelect } from "./payment-mode-select";
import { DeliveryStatusSelect } from "./delivery-status-select";
import { useToast, withToast } from "@/components/toast";

type FoodItemOption = { id: string; name: string; sellingPrice: string };

type OrderItemRow = {
  id: string;
  foodItemId: string;
  foodItemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  isSale: boolean;
};

function EditOrderItemRow({
  item,
  options,
  onCancel,
  updateOrderItem,
}: {
  item: OrderItemRow;
  options: FoodItemOption[];
  onCancel: () => void;
  updateOrderItem: (formData: FormData) => void | Promise<void>;
}) {
  const [foodItemId, setFoodItemId] = useState(item.foodItemId);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [isSale, setIsSale] = useState(item.isSale);
  const [price, setPrice] = useState(String(item.unitPrice));
  const toast = useToast();

  // The order's current item may no longer be in that day's menu (or even
  // active) — union it in so the select still shows the real current value
  // instead of silently defaulting to whatever's first.
  const selectOptions = useMemo(() => {
    if (options.some((o) => o.id === item.foodItemId)) return options;
    return [
      {
        id: item.foodItemId,
        name: item.foodItemName,
        sellingPrice: String(item.unitPrice),
      },
      ...options,
    ];
  }, [options, item.foodItemId, item.foodItemName, item.unitPrice]);

  function handleFoodItemChange(newId: string) {
    setFoodItemId(newId);
    if (!isSale) {
      const selected = selectOptions.find((o) => o.id === newId);
      if (selected) setPrice(selected.sellingPrice);
    }
  }

  function handleSaleToggle(checked: boolean) {
    setIsSale(checked);
    if (!checked) {
      const selected = selectOptions.find((o) => o.id === foodItemId);
      setPrice(selected?.sellingPrice ?? "0");
    }
  }

  return (
    <tr className="border-t border-brand-tan bg-brand-cream/40">
      <td />
      <td colSpan={7} className="px-4 py-3 pl-8">
        <form suppressHydrationWarning
          action={async (formData) => {
            const ok = await withToast(
              toast,
              () => updateOrderItem(formData),
              "Order item updated."
            );
            if (ok) onCancel();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <input suppressHydrationWarning type="hidden" name="id" value={item.id} />
          <div>
            <label className="block text-xs font-medium text-brand-brown-light">
              Food item
            </label>
            <select
              name="foodItemId"
              required
              value={foodItemId}
              onChange={(e) => handleFoodItemChange(e.target.value)}
              className="mt-1 rounded-md border border-brand-tan px-3 py-2 text-sm"
            >
              {selectOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-brown-light">
              Quantity
            </label>
            <input suppressHydrationWarning
              name="quantity"
              type="number"
              min="1"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-20 rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-brand-brown-light">
              <input suppressHydrationWarning
                type="checkbox"
                name="isSale"
                checked={isSale}
                onChange={(e) => handleSaleToggle(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-brand-tan text-brand-gold focus:ring-brand-gold"
              />
              Sale
            </label>
            <input suppressHydrationWarning
              name="price"
              type="number"
              min="0"
              step="0.01"
              disabled={!isSale}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-24 rounded-md border border-brand-tan px-3 py-2 text-sm disabled:bg-brand-cream disabled:text-brand-brown-light"
            />
          </div>
          <SubmitButton
            spinnerClassName="h-3 w-3"
            className="rounded-md bg-brand-red px-3 py-2 text-xs font-medium text-white hover:bg-brand-red-dark"
          >
            Save
          </SubmitButton>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-brand-tan px-3 py-2 text-xs font-medium text-brand-brown hover:bg-brand-cream"
          >
            Cancel
          </button>
        </form>
      </td>
    </tr>
  );
}

function AddItemToOrderRow({
  groupKey,
  options,
  onCancel,
  addOrderItem,
}: {
  groupKey: string;
  options: FoodItemOption[];
  onCancel: () => void;
  addOrderItem: (formData: FormData) => void | Promise<void>;
}) {
  const [foodItemId, setFoodItemId] = useState(options[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [isSale, setIsSale] = useState(false);
  const [price, setPrice] = useState(options[0]?.sellingPrice ?? "0");
  const toast = useToast();

  function handleFoodItemChange(newId: string) {
    setFoodItemId(newId);
    if (!isSale) {
      const selected = options.find((o) => o.id === newId);
      if (selected) setPrice(selected.sellingPrice);
    }
  }

  function handleSaleToggle(checked: boolean) {
    setIsSale(checked);
    if (!checked) {
      const selected = options.find((o) => o.id === foodItemId);
      setPrice(selected?.sellingPrice ?? "0");
    }
  }

  if (options.length === 0) {
    return (
      <tr className="border-t border-brand-tan bg-brand-cream/40">
        <td />
        <td colSpan={7} className="px-4 py-3 pl-8 text-sm text-brand-brown-light">
          No menu items available to add for this day.{" "}
          <button
            type="button"
            onClick={onCancel}
            className="font-medium text-brand-brown hover:underline"
          >
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-brand-tan bg-brand-cream/40">
      <td />
      <td colSpan={7} className="px-4 py-3 pl-8">
        <form suppressHydrationWarning
          action={async (formData) => {
            const ok = await withToast(
              toast,
              () => addOrderItem(formData),
              "Item added to order."
            );
            if (ok) onCancel();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <input suppressHydrationWarning type="hidden" name="groupKey" value={groupKey} />
          <div>
            <label className="block text-xs font-medium text-brand-brown-light">
              Food item
            </label>
            <select
              name="foodItemId"
              required
              value={foodItemId}
              onChange={(e) => handleFoodItemChange(e.target.value)}
              className="mt-1 rounded-md border border-brand-tan px-3 py-2 text-sm"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-brown-light">
              Quantity
            </label>
            <input suppressHydrationWarning
              name="quantity"
              type="number"
              min="1"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-20 rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-brand-brown-light">
              <input suppressHydrationWarning
                type="checkbox"
                name="isSale"
                checked={isSale}
                onChange={(e) => handleSaleToggle(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-brand-tan text-brand-gold focus:ring-brand-gold"
              />
              Sale
            </label>
            <input suppressHydrationWarning
              name="price"
              type="number"
              min="0"
              step="0.01"
              disabled={!isSale}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-24 rounded-md border border-brand-tan px-3 py-2 text-sm disabled:bg-brand-cream disabled:text-brand-brown-light"
            />
          </div>
          <SubmitButton
            spinnerClassName="h-3 w-3"
            className="rounded-md bg-brand-red px-3 py-2 text-xs font-medium text-white hover:bg-brand-red-dark"
          >
            Add item
          </SubmitButton>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-brand-tan px-3 py-2 text-xs font-medium text-brand-brown hover:bg-brand-cream"
          >
            Cancel
          </button>
        </form>
      </td>
    </tr>
  );
}

type Batch = {
  key: string;
  customerName: string;
  paymentStatus: string;
  deliveryStatus: string;
  paymentMode: string;
  totalAmount: number;
  items: OrderItemRow[];
};

type Group = {
  key: string;
  label: string;
  subtotal: number;
  batches: Batch[];
};

type SortKey = "customer" | "payment" | "delivery" | "mode";

function sortBatches(batches: Batch[], sort: SortState<SortKey>) {
  if (!sort) return batches;
  const { key, dir } = sort;
  const sign = dir === "asc" ? 1 : -1;
  return [...batches].sort((a, b) => {
    switch (key) {
      case "customer":
        return (
          sign *
          compareValues(
            a.customerName.toLowerCase(),
            b.customerName.toLowerCase()
          )
        );
      case "payment":
        return sign * compareValues(a.paymentStatus, b.paymentStatus);
      case "delivery":
        return sign * compareValues(a.deliveryStatus, b.deliveryStatus);
      case "mode":
        return sign * compareValues(a.paymentMode, b.paymentMode);
    }
  });
}

export function OrdersTable({
  groups,
  toggleOrderPaymentStatus,
  updateOrderDeliveryStatus,
  updateOrderPaymentMode,
  updateOrderItem,
  addOrderItem,
  menuByDate,
  allFoodItems,
  deleteOrder,
  deleteOrderBatch,
  bulkDeleteOrders,
  bulkUpdatePaymentStatus,
  bulkUpdateDeliveryStatus,
}: {
  groups: Group[];
  toggleOrderPaymentStatus: (
    groupKey: string,
    paymentStatus: string
  ) => void | Promise<void>;
  updateOrderDeliveryStatus: (formData: FormData) => void | Promise<void>;
  updateOrderPaymentMode: (formData: FormData) => void | Promise<void>;
  updateOrderItem: (formData: FormData) => void | Promise<void>;
  addOrderItem: (formData: FormData) => void | Promise<void>;
  menuByDate: Record<string, FoodItemOption[]>;
  allFoodItems: FoodItemOption[];
  deleteOrder: (id: string) => void | Promise<void>;
  deleteOrderBatch: (groupKey: string) => void | Promise<void>;
  bulkDeleteOrders: (ids: string[]) => void | Promise<void>;
  bulkUpdatePaymentStatus: (
    ids: string[],
    paymentStatus: string
  ) => void | Promise<void>;
  bulkUpdateDeliveryStatus: (
    ids: string[],
    deliveryStatus: string
  ) => void | Promise<void>;
}) {
  const [sort, setSort] = useState<SortState<SortKey>>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editOpenId, setEditOpenId] = useState<string | null>(null);
  const [addItemOpenKey, setAddItemOpenKey] = useState<string | null>(null);
  const toast = useToast();

  const sortedGroups = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        batches: sortBatches(group.batches, sort),
      })),
    [groups, sort]
  );

  const allIds = useMemo(
    () =>
      sortedGroups.flatMap((group) =>
        group.batches.flatMap((batch) => batch.items.map((item) => item.id))
      ),
    [sortedGroups]
  );

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === allIds.length ? new Set() : new Set(allIds)
    );
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    const ok = await withToast(
      toast,
      () => bulkDeleteOrders(ids),
      `${ids.length} order item${ids.length === 1 ? "" : "s"} deleted.`
    );
    if (ok) setSelected(new Set());
  }

  // Payment/delivery status applies per whole batch (same as the per-row
  // toggle above), so bulk-marking updates every batch touched by the
  // current selection — not just the individually checked item rows.
  async function handleMarkPaid() {
    const ids = Array.from(selected);
    const ok = await withToast(
      toast,
      () => bulkUpdatePaymentStatus(ids, "Paid"),
      `${ids.length} order${ids.length === 1 ? "" : "s"} marked paid.`
    );
    if (ok) setSelected(new Set());
  }

  async function handleMarkForDispatch() {
    const ids = Array.from(selected);
    const ok = await withToast(
      toast,
      () => bulkUpdateDeliveryStatus(ids, "For dispatch"),
      `${ids.length} order${ids.length === 1 ? "" : "s"} marked for dispatch.`
    );
    if (ok) setSelected(new Set());
  }

  async function handleMarkDelivered() {
    const ids = Array.from(selected);
    const ok = await withToast(
      toast,
      () => bulkUpdateDeliveryStatus(ids, "Delivered"),
      `${ids.length} order${ids.length === 1 ? "" : "s"} marked delivered.`
    );
    if (ok) setSelected(new Set());
  }

  return (
    <>
      <BulkDeleteBar
        count={selected.size}
        action={handleBulkDelete}
        extraActions={
          selected.size > 0 ? (
            <div className="flex items-center gap-2">
              <form suppressHydrationWarning action={handleMarkPaid}>
                <SubmitButton
                  spinnerClassName="h-3 w-3"
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-brand-brown hover:bg-brand-cream"
                >
                  Mark paid
                </SubmitButton>
              </form>
              <form suppressHydrationWarning action={handleMarkForDispatch}>
                <SubmitButton
                  spinnerClassName="h-3 w-3"
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-brand-brown hover:bg-brand-cream"
                >
                  Mark for dispatch
                </SubmitButton>
              </form>
              <form suppressHydrationWarning action={handleMarkDelivered}>
                <SubmitButton
                  spinnerClassName="h-3 w-3"
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-brand-brown hover:bg-brand-cream"
                >
                  Mark delivered
                </SubmitButton>
              </form>
            </div>
          ) : null
        }
      />
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
      <thead className="bg-brand-cream text-xs uppercase text-brand-brown-light">
        <tr>
          <th className="px-4 py-3">
            <input suppressHydrationWarning
              type="checkbox"
              checked={allIds.length > 0 && selected.size === allIds.length}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-brand-tan text-brand-red focus:ring-brand-red"
            />
          </th>
          <SortableHeader
            label="Customer / unit"
            sortKey="customer"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <th className="px-4 py-3">Order</th>
          <th className="px-4 py-3">Qty</th>
          <th className="px-4 py-3">Total</th>
          <SortableHeader
            label="Payment"
            sortKey="payment"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Delivery"
            sortKey="delivery"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <SortableHeader
            label="Mode"
            sortKey="mode"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <th className="px-4 py-3" />
        </tr>
      </thead>
      {sortedGroups.map((group) => (
        <CollapsibleGroup
          key={group.key}
          label={group.label}
          labelColSpan={3}
          subtotal={group.subtotal}
          trailingColSpan={5}
        >
          {group.batches.map((batch) => (
            <Fragment key={batch.key}>
              <tr className="bg-brand-cream/50 last:border-0">
                <td />
                <td colSpan={3} className="px-4 py-2 font-medium text-brand-brown">
                  {batch.customerName}
                  {batch.items.length > 1 && (
                    <span className="ml-2 text-xs font-normal text-brand-brown-light">
                      {batch.items.length} items
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 font-medium text-brand-brown">
                  {formatMoney(batch.totalAmount)}
                </td>
                <td className="px-4 py-2">
                  <form suppressHydrationWarning
                    action={async () => {
                      const next = batch.paymentStatus === "Paid" ? "Unpaid" : "Paid";
                      await withToast(
                        toast,
                        () => toggleOrderPaymentStatus(batch.key, next),
                        `Marked ${next}.`
                      );
                    }}
                  >
                    <SubmitButton
                      spinnerClassName="h-3 w-3"
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        batch.paymentStatus === "Paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {batch.paymentStatus}
                    </SubmitButton>
                  </form>
                </td>
                <td className="px-4 py-2">
                  <DeliveryStatusSelect
                    action={async (formData) => {
                      await withToast(
                        toast,
                        () => updateOrderDeliveryStatus(formData),
                        "Delivery status updated."
                      );
                    }}
                    groupKey={batch.key}
                    defaultValue={batch.deliveryStatus}
                  />
                </td>
                <td className="px-4 py-2">
                  <PaymentModeSelect
                    action={async (formData) => {
                      await withToast(
                        toast,
                        () => updateOrderPaymentMode(formData),
                        "Payment mode updated."
                      );
                    }}
                    groupKey={batch.key}
                    defaultValue={batch.paymentMode}
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setAddItemOpenKey((cur) =>
                          cur === batch.key ? null : batch.key
                        )
                      }
                      className="text-xs font-medium text-brand-brown hover:underline"
                    >
                      + Add item
                    </button>
                    <form
                      suppressHydrationWarning
                      action={async () => {
                        await withToast(
                          toast,
                          () => deleteOrderBatch(batch.key),
                          `${batch.customerName}'s order deleted.`
                        );
                      }}
                    >
                      <ConfirmSubmitButton
                        spinnerClassName="h-3 w-3"
                        confirmTitle="Delete this order?"
                        confirmMessage={`This will permanently delete "${batch.customerName}"'s entire order (${batch.items.length} item${batch.items.length === 1 ? "" : "s"}). This cannot be undone.`}
                        confirmLabel="Delete order"
                        danger
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete order
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
              {addItemOpenKey === batch.key && (
                <AddItemToOrderRow
                  groupKey={batch.key}
                  options={menuByDate[group.key] ?? allFoodItems}
                  onCancel={() => setAddItemOpenKey(null)}
                  addOrderItem={addOrderItem}
                />
              )}
              {batch.items.map((order) => (
                <Fragment key={order.id}>
                  <tr>
                    <td className="px-4 py-3">
                      <input suppressHydrationWarning
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={() => toggleOne(order.id)}
                        className="h-4 w-4 rounded border-brand-tan text-brand-red focus:ring-brand-red"
                      />
                    </td>
                    <td />
                    <td className="px-4 py-3 pl-8 text-brand-brown-light">
                      {order.foodItemName}
                      {order.isSale && (
                        <span className="ml-2 rounded-full bg-brand-gold/20 px-2 py-0.5 text-xs font-medium text-brand-red">
                          Sale
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{order.quantity}</td>
                    <td className="px-4 py-3 text-brand-brown-light">
                      {formatMoney(order.totalAmount)}
                    </td>
                    <td colSpan={3} />
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setEditOpenId((cur) =>
                              cur === order.id ? null : order.id
                            )
                          }
                          aria-label="Edit"
                          title="Edit"
                          className="rounded-md p-1.5 text-brand-brown hover:bg-brand-cream"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <form
                          suppressHydrationWarning
                          action={async () => {
                            await withToast(
                              toast,
                              () => deleteOrder(order.id),
                              `"${order.foodItemName}" removed from order.`
                            );
                          }}
                        >
                          <ConfirmSubmitButton
                            spinnerClassName="h-3 w-3"
                            confirmTitle="Delete this order item?"
                            confirmMessage={`This will permanently delete "${order.foodItemName}" from this order. This cannot be undone.`}
                            confirmLabel="Delete"
                            danger
                            aria-label="Delete"
                            title="Delete"
                            className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                  {editOpenId === order.id && (
                    <EditOrderItemRow
                      item={order}
                      options={menuByDate[group.key] ?? allFoodItems}
                      onCancel={() => setEditOpenId(null)}
                      updateOrderItem={updateOrderItem}
                    />
                  )}
                </Fragment>
              ))}
            </Fragment>
          ))}
        </CollapsibleGroup>
      ))}
      </table>
      </div>
    </>
  );
}
