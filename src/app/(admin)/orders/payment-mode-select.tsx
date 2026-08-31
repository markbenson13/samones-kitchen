"use client";

const PAYMENT_MODES = ["Cash", "GCash", "Both"];

export function PaymentModeSelect({
  action,
  defaultValue,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValue: string;
}) {
  return (
    <form action={action}>
      <select
        name="paymentMode"
        defaultValue={defaultValue}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
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
