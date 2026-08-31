"use client";

import { useState } from "react";
import Image from "next/image";
import { PanelLeftClose, PanelLeftOpen, Users } from "lucide-react";
import { NavLinks, NavLink } from "./nav-links";
import { UserMenu } from "./user-menu";

export function Sidebar({
  userName,
  userEmail,
  signOutAction,
}: {
  userName: string;
  userEmail?: string | null;
  signOutAction: () => void | Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-brand-tan bg-white transition-[width] duration-150 ${
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
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
