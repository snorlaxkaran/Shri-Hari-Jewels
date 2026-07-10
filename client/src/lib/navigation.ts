import {
  BarChart2,
  Briefcase,
  ClipboardCheck,
  Diamond,
  Factory,
  FileText,
  Gem,
  Package,
  PackageOpen,
  Palette,
  Scan,
  Send,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Users,
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
    title: "Inventory",
    items: [
      { label: "All stock", href: "/inventory", icon: icon(Package) },
      { label: "Entry verification", href: "/entry-verification", icon: icon(ClipboardCheck) },
      { label: "Raw materials", href: "/raw-inventory", icon: icon(Gem) },
    ],
  },
  {
    title: "Stock transfer",
    items: [
      { label: "Scan & send", href: "/stock-transfer", icon: icon(Scan) },
      { label: "Sent", href: "/stock-transfer/sent", icon: icon(Send) },
      { label: "Proforma list", href: "/stock-transfer/proforma", icon: icon(FileText) },
      { label: "Incoming", href: "/stock-transfer/incoming", icon: icon(PackageOpen) },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Sales", href: "/sales", icon: icon(ShoppingCart) },
      { label: "Orders", href: "/orders", icon: icon(ShoppingBag) },
      { label: "Customers", href: "/customers", icon: icon(Users) },
      { label: "Invoices", href: "/invoices", icon: icon(FileText) },
    ],
  },
  {
    title: "Production",
    items: [
      { label: "Designs", href: "/designs", icon: icon(Palette) },
      { label: "Motifs", href: "/motifs", icon: icon(Gem) },
      { label: "Work orders", href: "/work-orders", icon: icon(Briefcase) },
      { label: "Production runs", href: "/production-runs", icon: icon(Factory) },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "Sales analytics", href: "/sales-analytics", icon: icon(BarChart2) },
      { label: "GST report", href: "/reports/gst", icon: icon(FileText) },
      { label: "Stock valuation", href: "/reports/stock-valuation", icon: icon(Diamond) },
      { label: "Ageing stock", href: "/reports/ageing-stock", icon: icon(PackageOpen) },
      { label: "Staff performance", href: "/reports/staff-performance", icon: icon(Users) },
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
  if (pathname === "/inventory/new") return "Add Stock";
  if (pathname === "/inventory/add-units") return "Add Units";
  if (pathname.match(/^\/inventory\/[^/]+\/add-units$/)) return "Add Units";
  if (pathname.match(/^\/inventory\/[^/]+\/edit$/)) return "Edit Product";
  if (pathname.startsWith("/inventory/item/")) return "Item History";
  if (pathname.startsWith("/entry-verification/")) return "Entry Verification";
  if (pathname === "/entry-verification") return "Entry Verification";
  if (pathname === "/customers/new") return "Add Customer";
  if (pathname.match(/^\/customers\/[^/]+\/edit$/)) return "Edit Customer";
  if (pathname === "/branches/new") return "Add Branch";
  if (pathname === "/orders/new") return "New Order";
  if (pathname === "/work-orders/new") return "New Work Order";
  if (pathname === "/production-runs/new") return "New Production Run";
  if (pathname.startsWith("/stock-transfer/proforma")) return "Proforma List";
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
