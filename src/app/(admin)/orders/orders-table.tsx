"use client";

import { Fragment, useMemo, useState } from "react";
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

type OrderItemRow = {
  id: string;
  foodItemName: string;
  quantity: number;
  totalAmount: number;
  isSale: boolean;
};

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
  toggleOrderDeliveryStatus,
  updateOrderPaymentMode,
  deleteOrder,
  bulkDeleteOrders,
}: {
  groups: Group[];
  toggleOrderPaymentStatus: (
    groupKey: string,
    paymentStatus: string
  ) => void | Promise<void>;
  toggleOrderDeliveryStatus: (
    groupKey: string,
    deliveryStatus: string
  ) => void | Promise<void>;
  updateOrderPaymentMode: (formData: FormData) => void | Promise<void>;
  deleteOrder: (id: string) => void | Promise<void>;
  bulkDeleteOrders: (ids: string[]) => void | Promise<void>;
}) {
  const [sort, setSort] = useState<SortState<SortKey>>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    await bulkDeleteOrders(Array.from(selected));
    setSelected(new Set());
  }

  return (
    <>
      <BulkDeleteBar count={selected.size} action={handleBulkDelete} />
      <table className="w-full text-left text-sm">
      <thead className="bg-brand-cream text-xs uppercase text-brand-brown-light">
        <tr>
          <th className="px-4 py-3">
            <input
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
                    action={toggleOrderPaymentStatus.bind(
                      null,
                      batch.key,
                      batch.paymentStatus === "Paid" ? "Unpaid" : "Paid"
                    )}
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
                  <form suppressHydrationWarning
                    action={toggleOrderDeliveryStatus.bind(
                      null,
                      batch.key,
                      batch.deliveryStatus === "Delivered" ? "Pending" : "Delivered"
                    )}
                  >
                    <SubmitButton
                      spinnerClassName="h-3 w-3"
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        batch.deliveryStatus === "Delivered"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {batch.deliveryStatus}
                    </SubmitButton>
                  </form>
                </td>
                <td className="px-4 py-2">
                  <PaymentModeSelect
                    action={updateOrderPaymentMode}
                    groupKey={batch.key}
                    defaultValue={batch.paymentMode}
                  />
                </td>
                <td />
              </tr>
              {batch.items.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3">
                    <input
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
                    <form suppressHydrationWarning action={deleteOrder.bind(null, order.id)}>
                      <ConfirmSubmitButton
                        spinnerClassName="h-3 w-3"
                        confirmTitle="Delete this order item?"
                        confirmMessage={`This will permanently delete "${order.foodItemName}" from this order. This cannot be undone.`}
                        confirmLabel="Delete"
                        danger
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </CollapsibleGroup>
      ))}
      </table>
    </>
  );
}
