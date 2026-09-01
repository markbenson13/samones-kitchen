"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 15000;

// Periodically re-fetches the current page's server data so a change made
// on another device (or by another admin) shows up here without a manual
// reload. router.refresh() re-renders Server Components with fresh data
// while leaving client component state alone (open panels, in-progress form
// input, etc.), so this doesn't disrupt whatever's being worked on.
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    function refreshIfVisible() {
      // Skip while the tab is in the background — no point spending a
      // request (and a bit of DB compute) on a page nobody's looking at.
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }
    const interval = setInterval(refreshIfVisible, POLL_INTERVAL_MS);
    // Catch up immediately on regaining focus/visibility instead of waiting
    // for the next tick — that's exactly when the view is most likely
    // stale (the admin just switched back after working elsewhere).
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [router]);

  return null;
}
