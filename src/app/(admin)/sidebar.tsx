"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Menu, PanelLeftClose, PanelLeftOpen, Users, X } from "lucide-react";
import { NavLinks, NavLink } from "./nav-links";
import { UserMenu } from "./user-menu";

// Below this, the sidebar's own fixed 240px width starts eating too much of
// a tablet's content area — matches the xl breakpoint this app's other
// pages already use for the same reason (see dashboard/page.tsx).
const COLLAPSE_QUERY = "(max-width: 1279px)";
// Below this (Tailwind's `md`), there's no longer room for even an icon-only
// rail to sit beside the page content without squeezing it — the sidebar
// becomes a full-width off-canvas drawer instead, toggled by a hamburger
// button, so it costs zero layout width until opened.
const MOBILE_QUERY = "(max-width: 767px)";

function makeMediaQueryHook(query: string) {
  function subscribe(callback: () => void) {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  }
  function getSnapshot() {
    return window.matchMedia(query).matches;
  }
  // The server has no viewport to go on — matches this component's
  // original, always-expanded/always-desktop default, so there's nothing
  // for the client to correct once it takes over (useSyncExternalStore
  // handles that hydration handoff without a mismatch, unlike reading
  // window.innerWidth in an effect or a useState initializer would).
  function getServerSnapshot() {
    return false;
  }
  return () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const useIsNarrowViewport = makeMediaQueryHook(COLLAPSE_QUERY);
const useIsMobileViewport = makeMediaQueryHook(MOBILE_QUERY);

export function Sidebar({
  userName,
  userEmail,
  signOutAction,
}: {
  userName: string;
  userEmail?: string | null;
  signOutAction: () => void | Promise<void>;
}) {
  // Defaults to collapsed on tablet-and-narrower screens, expanded above
  // that — reactively, so rotating a tablet adjusts it too — until the user
  // manually toggles it once, after which their explicit choice sticks
  // regardless of screen size.
  const isNarrowViewport = useIsNarrowViewport();
  const isMobile = useIsMobileViewport();
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);
  // Below `md`, the sidebar is an off-canvas drawer, not an icon rail —
  // there's no layout-width cost to showing full labels once it's open, so
  // the collapse toggle only applies at tablet-and-up.
  const collapsed = !isMobile && (manualOverride ?? isNarrowViewport);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Floating trigger — the drawer itself is translated off-screen and
          costs no layout width when closed, so this is the only thing that
          needs to stay reachable outside the normal flex flow. */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed top-4 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-md border border-brand-tan bg-white text-brand-brown shadow-sm md:hidden print:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`flex flex-col border-r border-brand-tan bg-white print:hidden ${
          isMobile
            ? `fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 ${
                mobileOpen ? "translate-x-0" : "-translate-x-full"
              }`
            : `shrink-0 transition-[width] duration-150 ${collapsed ? "w-16" : "w-60"}`
        }`}
      >
        <div
          className={`flex border-b border-brand-tan px-2 py-4 ${
            collapsed ? "flex-col items-center gap-2" : "items-center justify-between gap-3 px-4"
          }`}
        >
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="SAMone's Kitchen"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 object-contain"
            />
            {!collapsed && (
              <p className="text-base font-semibold whitespace-nowrap text-brand-brown">
                SAMone&apos;s Kitchen
              </p>
            )}
          </div>
          {isMobile ? (
            <button
              type="button"
              onClick={closeMobile}
              title="Close menu"
              aria-label="Close menu"
              className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-brand-brown-light hover:bg-brand-cream hover:text-brand-red"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setManualOverride(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-brand-brown-light hover:bg-brand-cream hover:text-brand-red"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
          <NavLinks collapsed={collapsed} onNavigate={isMobile ? closeMobile : undefined} />
        </div>

        <div className="border-t border-brand-tan p-2">
          <NavLink
            href="/users"
            label="Users"
            icon={Users}
            collapsed={collapsed}
            onNavigate={isMobile ? closeMobile : undefined}
          />
          <div className="mt-1">
            <UserMenu
              name={userName}
              email={userEmail}
              signOutAction={signOutAction}
              collapsed={collapsed}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
