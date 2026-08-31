"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  ShoppingBasket,
  Receipt,
  Wallet,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/food-items", label: "Food Items", icon: UtensilsCrossed },
  { href: "/market-costs", label: "Market Costs", icon: ShoppingBasket },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/expenses", label: "Expenses", icon: Wallet },
];

export function NavLink({
  href,
  label,
  icon: Icon,
  collapsed = false,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
        collapsed ? "justify-center" : ""
      } ${
        isActive
          ? "bg-brand-red text-white"
          : "text-brand-brown-light hover:bg-brand-cream hover:text-brand-red"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && label}
    </Link>
  );
}

export function NavLinks({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_LINKS.map((link) => (
        <NavLink
          key={link.href}
          href={link.href}
          label={link.label}
          icon={link.icon}
          collapsed={collapsed}
        />
      ))}
    </nav>
  );
}
