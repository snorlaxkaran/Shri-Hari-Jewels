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
      { label: "Raw Stock", href: "/raw-inventory", icon: icon(Gem) },
      { label: "Sales", href: "/sales", icon: icon(ShoppingCart) },
      { label: "Orders", href: "/orders", icon: icon(ShoppingBag) },
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
    items: [{ label: "Settings", href: "/settings", icon: icon(Settings) }],
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
  for (const section of navSections) {
    const match = section.items.find((item) => item.href === pathname);
    if (match) return match.label;
  }
  return "Dashboard";
};
