"use client";

export function ConfirmModal({
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-left shadow-lg">
        {/* Explicit text-left: this dialog mounts wherever the triggering
            button lives in the tree (often a right-aligned table cell), and
            text-align is inherited regardless of this box's fixed position. */}
        <h3 className="text-sm font-semibold text-brand-brown">{title}</h3>
        <p className="mt-2 text-sm text-brand-brown-light">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-brand-tan px-4 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
              danger
                ? "bg-brand-red hover:bg-brand-red-dark"
                : "bg-brand-brown hover:bg-brand-brown/90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
