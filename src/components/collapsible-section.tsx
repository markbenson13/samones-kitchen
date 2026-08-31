"use client";

import { useState, type ReactNode } from "react";
import { Chevron } from "./chevron";

export function CollapsibleSection({
  title,
  description,
  collapsedSummary,
  children,
  defaultOpen = true,
}: {
  title: string;
  description?: ReactNode;
  collapsedSummary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
