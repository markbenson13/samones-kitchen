"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { PanelLeftClose, PanelLeftOpen, Users } from "lucide-react";
import { NavLinks, NavLink } from "./nav-links";
import { UserMenu } from "./user-menu";

// Below this, the sidebar's own fixed 240px width starts eating too much of
// a tablet's content area — matches the xl breakpoint this app's other
// pages already use for the same reason (see dashboard/page.tsx).
const COLLAPSE_QUERY = "(max-width: 1279px)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(COLLAPSE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}
function getSnapshot() {
  return window.matchMedia(COLLAPSE_QUERY).matches;
}
// The server has no viewport to go on — matches this component's original,
// always-expanded default, so there's nothing for the client to correct
// once it takes over (useSyncExternalStore handles that hydration handoff
// without a mismatch, unlike reading window.innerWidth in an effect or a
// useState initializer would).
function getServerSnapshot() {
  return false;
}

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
  const isNarrowViewport = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);
  const collapsed = manualOverride ?? isNarrowViewport;

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-brand-tan bg-white transition-[width] duration-150 print:hidden ${
        collapsed ? "w-16" : "w-60"
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
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        <NavLinks collapsed={collapsed} />
      </div>

      <div className="border-t border-brand-tan p-2">
        <NavLink href="/users" label="Users" icon={Users} collapsed={collapsed} />
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
  );
}
