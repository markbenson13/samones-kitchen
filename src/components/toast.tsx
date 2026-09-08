"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error";
type Toast = { id: number; kind: ToastKind; message: string };

const DISMISS_AFTER_MS = 4000;

const ToastContext = createContext<((kind: ToastKind, message: string) => void) | null>(
  null
);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-70 flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
              toast.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="shrink-0 text-lg leading-none opacity-60 hover:opacity-100"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  return {
    success: (message: string) => show?.("success", message),
    error: (message: string) => show?.("error", message),
  };
}

export function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : "Something went wrong.";
}

// Shared wrapper for every mutation call site: shows a success toast only if
// the action resolves without throwing, otherwise shows the thrown error's
// message as an error toast instead of letting it bubble to error.tsx.
// Returns whether it succeeded, so callers can skip follow-up state changes
// (closing an edit form, clearing a selection) when the action failed.
export async function withToast(
  toast: { success: (m: string) => void; error: (m: string) => void },
  fn: () => void | Promise<void>,
  successMessage?: string
): Promise<boolean> {
  try {
    await fn();
    if (successMessage) toast.success(successMessage);
    return true;
  } catch (err) {
    toast.error(errorMessage(err));
    return false;
  }
}
