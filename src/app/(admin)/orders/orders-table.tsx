"use client";

import { Fragment, useMemo, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { CollapsibleGroup } from "@/components/collapsible-group";
import {
  SortableHeader,
  nextSortState,
  compareValues,
  type SortState,
} from "@/components/sortable-header";
import { PaymentModeSelect } from "./payment-mode-select";

type OrderItemRow = { id: string; foodItemName: string; quantity: number };

type Batch = {
  key: string;
  customerName: string;
  paymentStatus: string;
  deliveryStatus: string;
  paymentMode: string;
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
  updateOrderPaymentMode: (
    groupKey: string,
    formData: FormData
  ) => void | Promise<void>;
  deleteOrder: (id: string) => void | Promise<void>;
}) {
  const [sort, setSort] = useState<SortState<SortKey>>(null);

  const sortedGroups = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        batches: sortBatches(group.batches, sort),
      })),
    [groups, sort]
  );

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-brand-cream text-xs uppercase text-brand-brown-light">
        <tr>
          <SortableHeader
            label="Customer / unit"
            sortKey="customer"
            currentSort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
          />
          <th className="px-4 py-3">Order</th>
          <th className="px-4 py-3">Qty</th>
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
          labelColSpan={2}
          subtotal={group.subtotal}
          trailingColSpan={4}
        >
          {group.batches.map((batch) => (
            <Fragment key={batch.key}>
              <tr className="bg-brand-cream/50 last:border-0">
                <td colSpan={3} className="px-4 py-2 font-medium text-brand-brown">
                  {batch.customerName}
                  {batch.items.length > 1 && (
                    <span className="ml-2 text-xs font-normal text-brand-brown-light">
                      {batch.items.length} items
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <form
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
                  <form
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
                    action={updateOrderPaymentMode.bind(null, batch.key)}
                    defaultValue={batch.paymentMode}
                  />
                </td>
                <td />
              </tr>
              {batch.items.map((order) => (
                <tr key={order.id}>
                  <td />
                  <td className="px-4 py-3 pl-8 text-brand-brown-light">
                    {order.foodItemName}
                  </td>
                  <td className="px-4 py-3">{order.quantity}</td>
                  <td colSpan={3} />
                  <td className="px-4 py-3 text-right">
                    <form action={deleteOrder.bind(null, order.id)}>
                      <SubmitButton
                        spinnerClassName="h-3 w-3"
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </CollapsibleGroup>
      ))}
    </table>
  );
}
