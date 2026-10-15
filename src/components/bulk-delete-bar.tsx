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
    <div className="flex flex-col gap-2 border-b border-brand-tan bg-brand-cream/60 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-brand-brown">
        {count} selected
      </span>
      {/* flex-wrap — on a narrow phone, a category select plus "Set
          category"/"Delete selected" buttons together don't fit on one
          line, and without wrap they'd silently overflow past the screen
          edge with no way to reach them. */}
      <div className="flex flex-wrap items-center gap-2">
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
