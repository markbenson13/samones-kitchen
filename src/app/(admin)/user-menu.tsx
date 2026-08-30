"use client";

import { useEffect, useRef, useState } from "react";

export function UserMenu({
  name,
  email,
  signOutAction,
}: {
  name: string;
  email?: string | null;
  signOutAction: () => void | Promise<void>;
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
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-brand-brown hover:bg-brand-cream"
      >
        {name}
        <svg
          className={`h-4 w-4 text-brand-brown-light transition-transform ${
            open ? "rotate-180" : ""
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
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-56 rounded-md border border-brand-tan bg-white text-sm shadow-lg">
          <div className="border-b border-brand-tan px-4 py-3">
            <p className="truncate font-medium text-brand-brown">{email}</p>
            <p className="mt-0.5 text-xs text-brand-brown-light">{name}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="block w-full rounded-b-md px-4 py-2 text-left text-brand-brown hover:bg-brand-cream"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
