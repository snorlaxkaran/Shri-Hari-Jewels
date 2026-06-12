import {
  LayoutDashboard,
  Diamond,
  ShoppingBag,
  Users,
  Layers,
  Tag,
  Image,
  BarChart2,
  FileText,
  Settings,
} from "lucide-react";
import { createElement, type ReactNode } from "react";

export type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
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
      {
        label: "Inventory",
        href: "/inventory",
        icon: icon(Diamond),
        badge: 248,
      },
      {
        label: "Orders",
        href: "/orders",
        icon: icon(ShoppingBag),
        badge: 12,
      },
      { label: "Customers", href: "/customers", icon: icon(Users) },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { label: "Collections", href: "/collections", icon: icon(Layers) },
      { label: "Pricing", href: "/pricing", icon: icon(Tag) },
      { label: "Gallery", href: "/gallery", icon: icon(Image) },
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

export const getPageTitle = (pathname: string): string => {
  for (const section of navSections) {
    const match = section.items.find((item) => item.href === pathname);
    if (match) return match.label;
  }
  return "Dashboard";
};
