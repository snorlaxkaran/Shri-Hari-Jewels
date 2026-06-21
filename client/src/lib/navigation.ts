import {
  LayoutDashboard,
  Diamond,
  Gem,
  ShoppingCart,
  ShoppingBag,
  Users,
  BarChart2,
  FileText,
  Settings,
  Briefcase,
  Store,
  ArrowRightLeft,
  List,
  Palette,
  Factory,
  PackageOpen,
} from "lucide-react";
import { createElement } from "react";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

const icon = (Component: React.ElementType) =>
  createElement(Component, { size: 17 });

export const navSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: icon(LayoutDashboard) },
      { label: "Products", href: "/inventory", icon: icon(Diamond) },
      { label: "Scan Transfer", href: "/stock-transfer", icon: icon(ArrowRightLeft) },
      { label: "Sent to Stores", href: "/stock-transfer/sent", icon: icon(List) },
      { label: "Incoming Stock", href: "/stock-transfer/incoming", icon: icon(PackageOpen) },
      { label: "Raw Stock", href: "/raw-inventory", icon: icon(Gem) },
      { label: "Bulk Stone Lots", href: "/bulk-stone-lots", icon: icon(Gem) },
      { label: "Sales", href: "/sales", icon: icon(ShoppingCart) },
      { label: "Orders", href: "/orders", icon: icon(ShoppingBag) },
      { label: "Work Orders", href: "/work-orders", icon: icon(Briefcase) },
      { label: "Designs", href: "/designs", icon: icon(Palette) },
      { label: "Motifs", href: "/motifs", icon: icon(Gem) },
      { label: "Production Runs", href: "/production-runs", icon: icon(Factory) },
      { label: "Customers", href: "/customers", icon: icon(Users) },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        label: "Sales Analytics",
        href: "/sales-analytics",
        icon: icon(BarChart2),
      },
      { label: "Invoices", href: "/invoices", icon: icon(FileText) },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Branches", href: "/branches", icon: icon(Store) },
      { label: "Settings", href: "/settings", icon: icon(Settings) },
    ],
  },
];

export const filterNavSections = (
  canAccess: (href: string) => boolean,
): NavSection[] =>
  navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccess(item.href)),
    }))
    .filter((section) => section.items.length > 0);

export const getPageTitle = (pathname: string): string => {
  if (pathname.startsWith("/stock-transfer/incoming")) return "Incoming Stock";
  if (pathname.startsWith("/stock-transfer/sent")) return "Sent to Stores";
  if (pathname === "/stock-transfer") return "Scan Transfer";
  if (pathname === "/designs/new") return "New Design";
  if (pathname.includes("/designs/") && pathname.includes("/builder/")) {
    return "Design Builder";
  }
  if (pathname.match(/^\/production-runs\/[^/]+\/[^/]+$/)) {
    return "Production Run";
  }
  for (const section of navSections) {
    const match = section.items.find((item) => item.href === pathname);
    if (match) return match.label;
  }
  return "Dashboard";
};
