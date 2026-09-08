"use client";

import { Suspense, useCallback, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLoadingReport } from "./loading-overlay";

// A single fixed id (not per-instance useId) so that both the click listener
// below and useReportNavigationStart (for programmatic router.push calls
// elsewhere) report into the same pending slot, cleared by the same effect.
const NAV_PROGRESS_ID = "nav-progress";

// Reports pending state to the shared loading overlay for plain <a>/<Link>
// navigation (sidebar links, "Reset" links, etc). A slow route change
// otherwise gives no feedback at all — since router.push/Link navigation is
// wrapped in a React transition, the old page just sits there unchanged
// until the new one is ready (confirmed: a route's own loading.tsx does NOT
// reliably show for this — it only fires on a boundary's first mount, not on
// navigation between already-visited sibling pages under the same layout).
// That reads as the click not having registered, so the user clicks again.
function NavProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const report = useLoadingReport();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentKey = `${pathname}?${searchParams.toString()}`;
  const currentKeyRef = useRef(currentKey);

  // Fires once the destination has actually rendered (pathname/search
  // changed) — clears the pending state and cancels the safety timeout.
  useEffect(() => {
    currentKeyRef.current = currentKey;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    report(NAV_PROGRESS_ID, false);
  }, [currentKey, report]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest?.(
        "a[href]"
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Built the same way as currentKey (via URLSearchParams#toString, not
      // url.search) so an unchanged query string compares equal regardless
      // of whether it's empty — url.search itself would include a leading
      // "?" only when non-empty, which never matches currentKey's fixed "?".
      const destKey = `${url.pathname}?${url.searchParams.toString()}`;
      // A link back to the current URL (or a same-page #hash) never fires
      // the effect above, which would otherwise leave this stuck pending.
      if (destKey === currentKeyRef.current) return;
      report(NAV_PROGRESS_ID, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Safety net in case navigation is interrupted/cancelled/errors and
      // the effect above never runs to clear it.
      timeoutRef.current = setTimeout(() => report(NAV_PROGRESS_ID, false), 8000);
    }
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [report]);

  return null;
}

export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <NavProgressInner />
    </Suspense>
  );
}

// For navigation triggered programmatically (router.push) rather than a
// plain <a> click — e.g. a date picker's onChange driving a searchParams
// change — where the click listener above has nothing to catch. Call this
// right before router.push; it's cleared by the same pathname/searchParams
// effect NavProgress already uses, once the destination has rendered.
// (useTransition's isPending was tried first but doesn't track a
// router.push's actual navigation time in this Next.js build — it resolves
// before the new route's data has loaded.)
export function useReportNavigationStart() {
  const report = useLoadingReport();
  return useCallback(() => report(NAV_PROGRESS_ID, true), [report]);
}
