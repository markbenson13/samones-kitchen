"use client";

import type { ReactNode } from "react";
import { ConfirmSubmitButton } from "./confirm-submit-button";

export function BulkDeleteBar({
  count,
  action,
  extraActions,
}: {
  count: number;
  action: () => void | Promise<void>;
  // Extra bulk-action buttons (e.g. Orders' "Mark paid"/"Mark delivered"),
  // rendered before the delete button. Each needs its own <form> — this bar
  // only wraps the delete button in one.
  extraActions?: ReactNode;
}) {
  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between border-b border-brand-tan bg-brand-cream/60 px-4 py-2">
      <span className="text-sm font-medium text-brand-brown">
        {count} selected
      </span>
      <div className="flex items-center gap-2">
        {extraActions}
        <form suppressHydrationWarning action={action}>
          <ConfirmSubmitButton
            spinnerClassName="h-3 w-3"
            pendingText="Deleting…"
            confirmTitle="Delete selected rows?"
            confirmMessage={`This will permanently delete ${count} selected row${count === 1 ? "" : "s"}. This cannot be undone.`}
            confirmLabel="Delete"
            danger
            className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Delete selected
          </ConfirmSubmitButton>
        </form>
      </div>
    </div>
  );
}
