"use client";

import { formatMoney } from "@/lib/money";

type ReceiptItem = {
  id: string;
  foodItemName: string;
  quantity: number;
  totalAmount: number;
  isSale: boolean;
};

export function ReceiptModal({
  customerName,
  dayLabel,
  deliveryNote,
  paymentStatus,
  paymentMode,
  items,
  totalAmount,
  onClose,
}: {
  customerName: string;
  dayLabel: string;
  deliveryNote: string | null;
  paymentStatus: string;
  paymentMode: string;
  items: ReceiptItem[];
  totalAmount: number;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-label={`Receipt for ${customerName}`}
    >
      {/* print-area — see globals.css: everything else on the page is
          hidden for print, and this box is pinned full-page instead of
          staying constrained to its on-screen modal size. */}
      <div className="print-area w-full max-w-sm rounded-xl bg-white p-6 text-left shadow-lg print:max-w-none print:rounded-none print:p-8 print:shadow-none">
        <div className="text-center">
          <p className="text-base font-semibold text-brand-brown">
            SAMone&apos;s Kitchen
          </p>
          <p className="text-xs text-brand-brown-light">{dayLabel}</p>
        </div>

        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-brand-brown-light">Customer / unit</span>
            <span className="font-medium text-brand-brown">{customerName}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-brand-brown-light">Payment</span>
            <span className="font-medium text-brand-brown">
              {paymentStatus} · {paymentMode}
            </span>
          </div>
          {deliveryNote && (
            <div className="flex justify-between gap-3">
              <span className="shrink-0 text-brand-brown-light">Note</span>
              <span className="text-right italic text-brand-brown">
                {deliveryNote}
              </span>
            </div>
          )}
        </div>

        <table className="mt-4 w-full border-t border-brand-tan text-sm">
          <thead>
            <tr className="text-xs uppercase text-brand-brown-light">
              <th className="py-2 text-left font-medium">Item</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-tan/60">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 pr-2 text-brand-brown">
                  {item.foodItemName}
                  {item.isSale && (
                    <span className="ml-1.5 rounded-full bg-brand-gold/20 px-1.5 py-0.5 text-[10px] font-medium text-brand-red">
                      Sale
                    </span>
                  )}
                </td>
                <td className="py-2 text-right text-brand-brown-light">
                  {item.quantity}
                </td>
                <td className="py-2 text-right text-brand-brown-light">
                  {formatMoney(item.totalAmount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-brand-tan">
              <td colSpan={2} className="py-2 font-semibold text-brand-brown">
                Total
              </td>
              <td className="py-2 text-right font-semibold text-brand-brown">
                {formatMoney(totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
