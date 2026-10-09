"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 15000;

// Dashboard's own query is the heaviest page in the app by far (nine
// queries including two all-time COUNT DISTINCT scans over every Order,
// plus summing a date range's worth of Sale/MarketCost/Expense rows in JS)
// — repeating all of that every 15s for a tab just sitting open adds up to
// real, wasted DB load. The other admin pages are cheap enough that polling
// them is fine.
const SKIP_INTERVAL_PATHS = ["/dashboard"];

// Periodically re-fetches the current page's server data so a change made
// on another device (or by another admin) shows up here without a manual
// reload. router.refresh() re-renders Server Components with fresh data
// while leaving client component state alone (open panels, in-progress form
// input, etc.), so this doesn't disrupt whatever's being worked on.
export function AutoRefresh() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function refreshIfVisible() {
      // Skip while the tab is in the background — no point spending a
      // request (and a bit of DB compute) on a page nobody's looking at.
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }
    const skipInterval = SKIP_INTERVAL_PATHS.some(
      (path) => pathname === path || pathname?.startsWith(`${path}/`)
    );
    const interval = skipInterval
      ? null
      : setInterval(refreshIfVisible, POLL_INTERVAL_MS);
    // Catch up immediately on regaining focus/visibility instead of waiting
    // for the next tick — that's exactly when the view is most likely
    // stale (the admin just switched back after working elsewhere). Kept
    // even on Dashboard: a one-off refresh on return is cheap, it's the
    // repeating interval that isn't.
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [router, pathname]);

  return null;
}
