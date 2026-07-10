"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BREADCRUMB_MAP: Record<
  string,
  { label: string; parent?: string; parentHref?: string }
> = {
  "/dashboard": { label: "Dashboard" },
  "/inventory": { label: "All stock", parent: "Inventory" },
  "/inventory/new": { label: "Add product", parent: "All stock", parentHref: "/inventory" },
  "/inventory/add-units": { label: "Add units", parent: "All stock", parentHref: "/inventory" },
  "/entry-verification": { label: "Entry verification", parent: "Inventory" },
  "/raw-inventory": { label: "Raw materials", parent: "Inventory" },
  "/sales": { label: "Sales", parent: "Sales" },
  "/orders": { label: "Orders", parent: "Sales" },
  "/orders/new": { label: "New order", parent: "Orders", parentHref: "/orders" },
  "/customers": { label: "Customers", parent: "Sales" },
  "/customers/new": { label: "Add customer", parent: "Customers", parentHref: "/customers" },
  "/invoices": { label: "Invoices", parent: "Sales" },
  "/work-orders": { label: "Work orders", parent: "Production" },
  "/work-orders/new": { label: "New work order", parent: "Work orders", parentHref: "/work-orders" },
  "/designs": { label: "Designs", parent: "Production" },
  "/designs/new": { label: "New design", parent: "Designs", parentHref: "/designs" },
  "/motifs": { label: "Motifs", parent: "Production" },
  "/production-runs": { label: "Production runs", parent: "Production" },
  "/production-runs/new": { label: "New run", parent: "Production runs", parentHref: "/production-runs" },
  "/stock-transfer": { label: "Scan & send", parent: "Stock transfer" },
  "/stock-transfer/sent": { label: "Sent", parent: "Stock transfer" },
  "/stock-transfer/proforma": { label: "Proforma list", parent: "Stock transfer" },
  "/stock-transfer/incoming": { label: "Incoming", parent: "Stock transfer" },
  "/sales-analytics": { label: "Sales analytics", parent: "Reports" },
  "/reports/gst": { label: "GST report", parent: "Reports" },
  "/reports/stock-valuation": { label: "Stock valuation", parent: "Reports" },
  "/reports/ageing-stock": { label: "Ageing stock", parent: "Reports" },
  "/reports/staff-performance": { label: "Staff performance", parent: "Reports" },
  "/branches": { label: "Branches", parent: "System" },
  "/settings": { label: "Settings", parent: "System" },
};

const SECTION_HREFS: Record<string, string> = {
  Inventory: "/inventory",
  "Stock transfer": "/stock-transfer",
  Sales: "/sales",
  Production: "/designs",
  Reports: "/sales-analytics",
  System: "/settings",
};

type Crumb = { label: string; href?: string };

function getSectionName(parentLabel: string, parentHref?: string): string | undefined {
  if (parentHref && BREADCRUMB_MAP[parentHref]?.parent) {
    return BREADCRUMB_MAP[parentHref].parent;
  }
  const sectionNames = ["Inventory", "Stock transfer", "Sales", "Production", "Reports", "System"];
  if (sectionNames.includes(parentLabel)) return parentLabel;
  return undefined;
}

function resolveCrumbs(pathname: string): { crumbs: Crumb[]; leaf: string } {
  if (pathname.startsWith("/stock-transfer/sent/") && pathname !== "/stock-transfer/sent") {
    return {
      crumbs: [
        { label: "Home", href: "/dashboard" },
        { label: "Stock transfer", href: "/stock-transfer" },
        { label: "Sent", href: "/stock-transfer/sent" },
      ],
      leaf: "Transfer detail",
    };
  }
  if (pathname.startsWith("/stock-transfer/incoming/") && pathname !== "/stock-transfer/incoming") {
    return {
      crumbs: [
        { label: "Home", href: "/dashboard" },
        { label: "Stock transfer", href: "/stock-transfer" },
        { label: "Incoming", href: "/stock-transfer/incoming" },
      ],
      leaf: "Transfer detail",
    };
  }

  if (BREADCRUMB_MAP[pathname]) {
    const entry = BREADCRUMB_MAP[pathname];
    const crumbs: Crumb[] = [{ label: "Home", href: "/dashboard" }];

    if (entry.parentHref) {
      const section = getSectionName(entry.parent!, entry.parentHref);
      if (section && section !== entry.parent) {
        crumbs.push({ label: section, href: SECTION_HREFS[section] });
      }
      crumbs.push({ label: entry.parent!, href: entry.parentHref });
      return { crumbs, leaf: entry.label };
    }

    if (entry.parent) {
      crumbs.push({ label: entry.parent, href: SECTION_HREFS[entry.parent] });
      return { crumbs, leaf: entry.label };
    }

    return { crumbs, leaf: entry.label };
  }

  const sortedKeys = Object.keys(BREADCRUMB_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (pathname.startsWith(key + "/")) {
      const entry = BREADCRUMB_MAP[key];
      const crumbs: Crumb[] = [{ label: "Home", href: "/dashboard" }];
      if (entry.parent) {
        crumbs.push({ label: entry.parent, href: SECTION_HREFS[entry.parent] });
      }
      crumbs.push({ label: entry.label, href: key });
      const tail = pathname.slice(key.length + 1).replace(/-/g, " ");
      return { crumbs, leaf: tail || "Detail" };
    }
  }

  return {
    crumbs: [{ label: "Home", href: "/dashboard" }],
    leaf: pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ?? "Page",
  };
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const { crumbs, leaf } = resolveCrumbs(pathname);

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        height: 36,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 24px",
        background: "var(--bg-surface)",
        borderBottom: "0.5px solid var(--border)",
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      {crumbs.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span style={{ color: "var(--text-muted)" }}>/</span>}
          {crumb.href ? (
            <Link href={crumb.href} style={{ color: "var(--accent)", textDecoration: "none" }}>
              {crumb.label}
            </Link>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>{crumb.label}</span>
          )}
        </span>
      ))}
      {crumbs.length > 0 && <span style={{ color: "var(--text-muted)" }}>/</span>}
      <span style={{ color: "var(--text-primary)" }}>{leaf}</span>
    </nav>
  );
}
