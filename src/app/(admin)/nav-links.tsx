"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  ShoppingBasket,
  Receipt,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/food-items", label: "Food Items", icon: UtensilsCrossed },
  { href: "/market-costs", label: "Market Costs", icon: ShoppingBasket },
  { href: "/sales", label: "Sales", icon: Receipt },
];

export function NavLinks({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_LINKS.map((link) => {
        const isActive =
          pathname === link.href || pathname?.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            title={collapsed ? link.label : undefined}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
              collapsed ? "justify-center" : ""
            } ${
              isActive
                ? "bg-brand-red text-white"
                : "text-brand-brown-light hover:bg-brand-cream hover:text-brand-red"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && link.label}
          </Link>
        );
      })}
    </nav>
  );
}
