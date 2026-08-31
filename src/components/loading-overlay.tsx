"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "./spinner";

const LoadingContext = createContext<
  ((id: string, pending: boolean) => void) | null
>(null);

export function LoadingOverlayProvider({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const pendingIds = useRef(new Set<string>());

  const report = useCallback((id: string, pending: boolean) => {
    const ids = pendingIds.current;
    const hadAny = ids.size > 0;
    if (pending) ids.add(id);
    else ids.delete(id);
    const hasAnyNow = ids.size > 0;
    if (hasAnyNow !== hadAny) setBusy(hasAnyNow);
  }, []);

  return (
    <LoadingContext.Provider value={report}>
      {children}
      {busy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-4 shadow-lg">
            <Spinner className="h-5 w-5 text-brand-red" />
            <span className="text-sm font-medium text-brand-brown">
              Working…
            </span>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

// Reports this component's nearest-form pending state to the global overlay,
// for forms (like an auto-submitting <select>) that have no SubmitButton of
// their own to report it. Must be rendered inside the <form>.
export function FormPendingReporter() {
  const { pending } = useFormStatus();
  const report = useLoadingReport();
  const id = useId();

  useEffect(() => {
    report(id, pending);
    return () => report(id, false);
  }, [report, id, pending]);

  return null;
}

export function useLoadingReport() {
  const report = useContext(LoadingContext);
  return report ?? (() => {});
}
