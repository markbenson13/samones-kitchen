"use client";

import { useState, type ReactNode } from "react";
import { Chevron } from "./chevron";

export function CollapsibleSection({
  title,
  description,
  collapsedSummary,
  children,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
}: {
  title: string;
  description?: ReactNode;
  collapsedSummary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  // Uncontrolled by default (internal state, seeded from defaultOpen). Pass
  // both `open` and `onOpenChange` to drive it externally instead — e.g. to
  // force it open when an edit starts elsewhere on the page.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;

  function toggle() {
    const next = !open;
    setInternalOpen(next);
    onOpenChange?.(next);
  }

  return (
    <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 text-left"
      >
        <Chevron open={open} className="h-4 w-4" />
        <span>
          <span className="block text-sm font-medium text-brand-brown">
            {title}
          </span>
          {open
            ? description && (
                <span className="mt-1 block text-xs text-brand-brown-light">
                  {description}
                </span>
              )
            : collapsedSummary && (
                <span className="mt-1 block text-xs text-brand-brown-light">
                  {collapsedSummary}
                </span>
              )}
        </span>
      </button>

      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}
