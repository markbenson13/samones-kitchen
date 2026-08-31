"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "./spinner";
import { useLoadingReport } from "./loading-overlay";
import { ConfirmModal } from "./confirm-modal";

export function ConfirmSubmitButton({
  children,
  confirmMessage,
  confirmTitle = "Are you sure?",
  confirmLabel = "Confirm",
  danger = false,
  pendingText,
  className,
  spinnerClassName = "h-3.5 w-3.5",
  ...rest
}: {
  children: ReactNode;
  confirmMessage: string;
  confirmTitle?: string;
  confirmLabel?: string;
  danger?: boolean;
  pendingText?: ReactNode;
  className?: string;
  spinnerClassName?: string;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "onClick" | "className" | "children" | "disabled"
>) {
  const { pending } = useFormStatus();
  const report = useLoadingReport();
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    report(id, pending);
    return () => report(id, false);
  }, [report, id, pending]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() => setOpen(true)}
        className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
        {...rest}
      >
        <span className="inline-flex items-center justify-center gap-1.5">
          {pending && <Spinner className={spinnerClassName} />}
          {pending && pendingText ? pendingText : children}
        </span>
      </button>
      {open && (
        <ConfirmModal
          title={confirmTitle}
          message={confirmMessage}
          confirmLabel={confirmLabel}
          danger={danger}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false);
            buttonRef.current?.form?.requestSubmit();
          }}
        />
      )}
    </>
  );
}
