"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/food-items", label: "Food Items" },
  { href: "/market-costs", label: "Market Costs" },
  { href: "/sales", label: "Sales" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_LINKS.map((link) => {
        const isActive =
          pathname === link.href || pathname?.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`block rounded-md px-3 py-2 text-sm font-medium ${
              isActive
                ? "bg-brand-red text-white"
                : "text-brand-brown-light hover:bg-brand-cream hover:text-brand-red"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
