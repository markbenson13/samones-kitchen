"use client";

import { useState, type ReactNode } from "react";
import { Chevron } from "./chevron";

export function CollapsibleGroup({
  label,
  labelColSpan,
  subtotal,
  trailingColSpan,
  children,
  defaultOpen = true,
}: {
  label: string;
  labelColSpan: number;
  subtotal: ReactNode;
  trailingColSpan: number;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <tbody className="divide-y divide-brand-tan/60 border-t-2 border-brand-tan">
      <tr
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer select-none bg-brand-cream-dark/50 hover:bg-brand-cream-dark/70"
      >
        <td
          colSpan={labelColSpan}
          className="px-4 py-2 text-sm font-semibold text-brand-brown"
        >
          <span className="inline-flex items-center gap-2">
            <Chevron open={open} />
            {label}
          </span>
        </td>
        <td className="px-4 py-2 text-sm font-semibold text-brand-brown">
          {subtotal}
        </td>
        <td colSpan={trailingColSpan} />
      </tr>
      {open && children}
    </tbody>
  );
}
