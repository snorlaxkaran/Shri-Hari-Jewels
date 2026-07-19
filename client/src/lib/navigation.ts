import {
  Award,
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
  Tags,
  Users,
  Globe,
  UserPlus,
  Wrench,
  Wallet,
} from "lucide-react";
import { createElement } from "react";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  /** Temporary marker for features shipped on 2026-07-18 */
  highlightToday?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

/** Routes added or updated in today's commits — remove when review is done. */
export const TODAY_HIGHLIGHT_HREFS = [
  "/dashboard",
  "/sales",
  "/invoices",
  "/leads",
  "/repairs",
  "/vendors",
  "/purchase-bills",
  "/settings",
  "/settings/tally-export",
  "/sales-analytics",
  "/reports/category",
  "/reports/department",
  "/reports/customer",
  "/reports/location-wise",
  "/reports/cad",
  "/reports/stock-report",
  "/reports/gst",
  "/reports/stock-valuation",
  "/reports/ageing-stock",
  "/reports/staff-performance",
] as const;

export const isTodayHighlightRoute = (pathname: string): boolean =>
  TODAY_HIGHLIGHT_HREFS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

const markToday = (item: Omit<NavItem, "highlightToday">): NavItem => ({
  ...item,
  highlightToday: isTodayHighlightRoute(item.href),
});

const icon = (Component: React.ElementType) =>
  createElement(Component, { size: 17 });

export const navSections: NavSection[] = [
  {
    title: "Inventory",
    items: [
      { label: "All stock", href: "/inventory", icon: icon(Package) },
      { label: "Product", href: "/products", icon: icon(Tags) },
      { label: "Hallmark (HUID)", href: "/hallmark", icon: icon(Award) },
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
      markToday({ label: "Sales", href: "/sales", icon: icon(ShoppingCart) }),
      { label: "Orders", href: "/orders", icon: icon(ShoppingBag) },
      { label: "Customers", href: "/customers", icon: icon(Users) },
      markToday({ label: "Leads", href: "/leads", icon: icon(UserPlus) }),
      markToday({ label: "Repairs", href: "/repairs", icon: icon(Wrench) }),
      markToday({ label: "Invoices", href: "/invoices", icon: icon(FileText) }),
    ],
  },
  {
    title: "Production",
    items: [
      { label: "Designs", href: "/designs", icon: icon(Palette) },
      { label: "Motifs", href: "/motifs", icon: icon(Gem) },
      { label: "Work orders", href: "/work-orders", icon: icon(Briefcase) },
      { label: "Production runs", href: "/production-runs", icon: icon(Factory) },
      { label: "Production board", href: "/production-runs/dashboard", icon: icon(Factory) },
      { label: "Karigar settlements", href: "/karigar-settlements", icon: icon(Briefcase) },
    ],
  },
  {
    title: "Reports",
    items: [
      markToday({ label: "Sales analytics", href: "/sales-analytics", icon: icon(BarChart2) }),
      markToday({ label: "Category report", href: "/reports/category", icon: icon(BarChart2) }),
      markToday({ label: "Department report", href: "/reports/department", icon: icon(BarChart2) }),
      markToday({ label: "Customer report", href: "/reports/customer", icon: icon(Users) }),
      markToday({ label: "Location-wise", href: "/reports/location-wise", icon: icon(Store) }),
      markToday({ label: "CAD pipeline", href: "/reports/cad", icon: icon(Palette) }),
      markToday({ label: "Stock snapshot", href: "/reports/stock-report", icon: icon(Package) }),
      markToday({ label: "GST report", href: "/reports/gst", icon: icon(FileText) }),
      markToday({ label: "Stock valuation", href: "/reports/stock-valuation", icon: icon(Diamond) }),
      markToday({ label: "Ageing stock", href: "/reports/ageing-stock", icon: icon(PackageOpen) }),
      markToday({ label: "Staff performance", href: "/reports/staff-performance", icon: icon(Users) }),
    ],
  },
  {
    title: "Online Store",
    items: [
      { label: "Store dashboard", href: "/storefront", icon: icon(Globe) },
      { label: "Store settings", href: "/storefront/settings", icon: icon(Settings) },
      { label: "Publish products", href: "/storefront/products", icon: icon(Package) },
      { label: "Collections", href: "/storefront/collections", icon: icon(Palette) },
      { label: "Web orders", href: "/storefront/orders", icon: icon(ShoppingBag) },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Branches", href: "/branches", icon: icon(Store) },
      markToday({ label: "Vendors", href: "/vendors", icon: icon(Briefcase) }),
      markToday({ label: "Purchase bills", href: "/purchase-bills", icon: icon(FileText) }),
      { label: "Expenses", href: "/expenses", icon: icon(Wallet) },
      markToday({ label: "Settings", href: "/settings", icon: icon(Settings) }),
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

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export const getNavSectionForPath = (pathname: string): NavSection | undefined => {
  for (const section of navSections) {
    if (section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      return section;
    }
  }
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return { title: "Overview", items: [] };
  }
  return undefined;
};

export const getBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const crumbs: BreadcrumbItem[] = [{ label: "Home", href: "/dashboard" }];

  const section = getNavSectionForPath(pathname);
  if (section && section.title !== "Overview") {
    const firstItem = section.items[0];
    crumbs.push({
      label: section.title,
      href: firstItem?.href,
    });
  }

  const pageTitle = getPageTitle(pathname);
  if (pageTitle !== "Dashboard" && pageTitle !== section?.title) {
    crumbs.push({ label: pageTitle });
  }

  return crumbs;
};

export const getPageTitle = (pathname: string): string => {
  if (pathname.match(/^\/products\/[^/]+\/edit$/)) return "Edit Product";
  if (pathname === "/inventory/new") return "Add Stock";
  if (pathname === "/inventory/add-units") return "Add Units";
  if (pathname.match(/^\/inventory\/[^/]+\/add-units$/)) return "Add Units";
  if (pathname.match(/^\/inventory\/[^/]+\/edit$/)) return "Edit Product";
  if (pathname.startsWith("/inventory/item/")) return "Item History";
  if (pathname.startsWith("/entry-verification/")) return "Entry Verification";
  if (pathname === "/entry-verification") return "Entry Verification";
  if (pathname === "/leads/calendar") return "Leads Calendar";
  if (pathname.startsWith("/leads/")) return "Lead Detail";
  if (pathname === "/customers/new") return "Add Customer";
  if (pathname.match(/^\/customers\/[^/]+\/edit$/)) return "Edit Customer";
  if (pathname === "/branches/new") return "Add Branch";
  if (pathname === "/orders/new") return "New Order";
  if (pathname === "/work-orders/new") return "New Work Order";
  if (pathname === "/repairs/new") return "New Repair";
  if (pathname.startsWith("/hallmark/") && pathname.endsWith("/new")) {
    return "New Hallmark Batch";
  }
  if (pathname.startsWith("/hallmark/")) return "Hallmark Batch";
  if (pathname === "/hallmark") return "Hallmark (HUID)";
  if (pathname.startsWith("/repairs/")) return "Repair Detail";
  if (pathname === "/expenses/new") return "New Expense Request";
  if (pathname === "/expenses") return "Expenses";
  if (pathname === "/settings/tally-export") return "Tally Export";
  if (pathname === "/production-runs/new") return "New Production Run";
  if (pathname === "/production-runs/dashboard") return "Production Dashboard";
  if (pathname === "/karigar-settlements") return "Karigar Settlements";
  if (pathname.startsWith("/stock-transfer/proforma")) return "Proforma List";
  if (pathname.startsWith("/stock-transfer/incoming/") && pathname.endsWith("/receive")) {
    return "Verify Transfer";
  }
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
  if (pathname === "/storefront/settings") return "Store Settings";
  if (pathname === "/storefront/products") return "Publish Products";
  if (pathname === "/storefront/collections") return "Collections";
  if (pathname === "/storefront/orders") return "Web Orders";
  if (pathname === "/storefront") return "Online Store";
  for (const section of navSections) {
    const match = section.items.find((item) => item.href === pathname);
    if (match) return match.label;
  }
  return "Dashboard";
};
