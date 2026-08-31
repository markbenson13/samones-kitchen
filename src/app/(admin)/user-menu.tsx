"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";

export function UserMenu({
  name,
  email,
  signOutAction,
  collapsed = false,
}: {
  name: string;
  email?: string | null;
  signOutAction: () => void | Promise<void>;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={collapsed ? name : undefined}
        className={`flex w-full items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {collapsed ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-cream-dark text-xs font-semibold text-brand-brown">
            {name.charAt(0).toUpperCase()}
          </span>
        ) : (
          <>
            {name}
            <svg
              className={`h-4 w-4 shrink-0 text-brand-brown-light transition-transform ${
                open ? "" : "rotate-180"
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-full min-w-56 rounded-md border border-brand-tan bg-white text-sm shadow-lg">
          <div className="border-b border-brand-tan px-4 py-3">
            <p className="truncate font-medium text-brand-brown">{email}</p>
            <p className="mt-0.5 text-xs text-brand-brown-light">{name}</p>
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-2 text-left text-brand-brown hover:bg-brand-cream"
          >
            Change password
          </Link>
          <form suppressHydrationWarning action={signOutAction}>
            <SubmitButton
              pendingText="Signing out…"
              className="block w-full rounded-b-md px-4 py-2 text-left text-brand-brown hover:bg-brand-cream"
            >
              Sign out
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
