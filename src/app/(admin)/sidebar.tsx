"use client";

import { useState } from "react";
import Image from "next/image";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavLinks } from "./nav-links";
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
        className={`flex items-center gap-3 border-b border-brand-tan px-4 py-4 ${
          collapsed ? "justify-center px-2" : ""
        }`}
      >
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        <NavLinks collapsed={collapsed} />
      </div>

      <div className="border-t border-brand-tan p-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`mb-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-brand-brown-light hover:bg-brand-cream hover:text-brand-red ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              Collapse
            </>
          )}
        </button>
        <UserMenu
          name={userName}
          email={userEmail}
          signOutAction={signOutAction}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}
