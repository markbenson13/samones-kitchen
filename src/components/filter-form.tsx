"use client";

import { useRouter, usePathname } from "next/navigation";
import { useReportNavigationStart } from "./nav-progress";
import type { FormHTMLAttributes } from "react";

// A drop-in replacement for a plain <form> used only to filter a page via
// its own query string (no server action). A native GET form submit causes
// a full browser page reload — which the browser freezes/stops painting
// during, so no in-page loading indicator (the shared "Working…" overlay,
// SubmitButton's spinner) can ever actually become visible, no matter how
// long the request takes. Submitting via router.push instead keeps this a
// normal client-side transition, so the existing overlay works the same way
// it already does for sidebar/Reset link clicks and the Managing day picker.
export function FilterForm(props: FormHTMLAttributes<HTMLFormElement>) {
  const router = useRouter();
  const pathname = usePathname();
  const reportNavStart = useReportNavigationStart();

  return (
    <form
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        for (const [key, value] of new FormData(e.currentTarget).entries()) {
          if (typeof value === "string") params.append(key, value);
        }
        reportNavStart();
        router.push(`${pathname}?${params.toString()}`);
      }}
    />
  );
}
