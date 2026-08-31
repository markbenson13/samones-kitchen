"use client";

import { useEffect, useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "./spinner";
import { useLoadingReport } from "./loading-overlay";

export function SubmitButton({
  children,
  pendingText,
  className,
  spinnerClassName = "h-3.5 w-3.5",
  ...rest
}: {
  children: ReactNode;
  pendingText?: ReactNode;
  className?: string;
  spinnerClassName?: string;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "className" | "children" | "disabled"
>) {
  const { pending } = useFormStatus();
  const report = useLoadingReport();
  const id = useId();

  useEffect(() => {
    report(id, pending);
    return () => report(id, false);
  }, [report, id, pending]);

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
      {...rest}
    >
      <span className="inline-flex items-center justify-center gap-1.5">
        {pending && <Spinner className={spinnerClassName} />}
        {pending && pendingText ? pendingText : children}
      </span>
    </button>
  );
}
