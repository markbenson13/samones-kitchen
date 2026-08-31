"use client";

import { useState } from "react";
import { FormPendingReporter } from "@/components/loading-overlay";

const PAYMENT_MODES = ["Cash", "GCash", "Both"];

export function PaymentModeSelect({
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
    <form action={action}>
      <FormPendingReporter />
      <input type="hidden" name="groupKey" value={groupKey} />
      {/* Keyed on value so a change forces a fresh mount: React resets a
          form's fields to their own defaultValue once its action completes,
          and since it skips re-writing a controlled value it already
          believes is unchanged, an uncontrolled select could get silently
          snapped back to a stale option. Remounting sidesteps that. */}
      <select
        key={value}
        name="paymentMode"
        defaultValue={value}
        onChange={(e) => {
          setValue(e.target.value);
          e.currentTarget.form?.requestSubmit();
        }}
        className="rounded-md border border-brand-tan px-2 py-1 text-xs text-brand-brown"
      >
        {PAYMENT_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>
    </form>
  );
}
