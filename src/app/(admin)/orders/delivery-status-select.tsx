"use client";

import { useState } from "react";
import { FormPendingReporter } from "@/components/loading-overlay";

const DELIVERY_STATUSES = ["Pending", "For dispatch", "Delivered"];

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-neutral-200 text-neutral-600",
  "For dispatch": "bg-amber-100 text-amber-800",
  Delivered: "bg-emerald-100 text-emerald-700",
};

export function DeliveryStatusSelect({
  action,
  groupKey,
  defaultValue,
}: {
  action: (formData: FormData) => void | Promise<void>;
  groupKey: string;
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);

  // Pick up a server-confirmed value if it changes for a reason other than
  // this select's own edit (e.g. another admin updated it).
  const [syncedValue, setSyncedValue] = useState(defaultValue);
  if (defaultValue !== syncedValue) {
    setSyncedValue(defaultValue);
    setValue(defaultValue);
  }

  return (
    <form suppressHydrationWarning action={action}>
      <FormPendingReporter />
      <input suppressHydrationWarning type="hidden" name="groupKey" value={groupKey} />
      {/* Keyed on value so a change forces a fresh mount — same reasoning
          as PaymentModeSelect: an uncontrolled select could otherwise get
          silently snapped back to a stale option once the form's action
          completes and React resets fields to their own defaultValue. */}
      <select
        key={value}
        name="deliveryStatus"
        defaultValue={value}
        onChange={(e) => {
          setValue(e.target.value);
          e.currentTarget.form?.requestSubmit();
        }}
        className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${
          STATUS_STYLES[value] ?? "bg-neutral-200 text-neutral-600"
        }`}
      >
        {DELIVERY_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </form>
  );
}
