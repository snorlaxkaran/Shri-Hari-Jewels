"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Segment = { label: string; href?: string };

const HOME: Segment = { label: "Home", href: "/dashboard" };

const ROUTE_TRAILS: Record<string, Segment[]> = {
  "/dashboard": [{ label: "Home" }],
  "/inventory": [HOME, { label: "All stock" }],
  "/inventory/new": [HOME, { label: "All stock", href: "/inventory" }, { label: "Add product" }],
  "/inventory/add-units": [HOME, { label: "All stock", href: "/inventory" }, { label: "Add units" }],
  "/entry-verification": [HOME, { label: "Entry verification" }],
  "/raw-inventory": [HOME, { label: "Raw materials" }],
  "/sales": [HOME, { label: "Sales" }],
  "/orders": [HOME, { label: "Orders" }],
  "/orders/new": [HOME, { label: "Orders", href: "/orders" }, { label: "New order" }],
  "/customers": [HOME, { label: "Customers" }],
  "/customers/new": [HOME, { label: "Customers", href: "/customers" }, { label: "Add customer" }],
  "/invoices": [HOME, { label: "Invoices" }],
  "/work-orders": [HOME, { label: "Work orders" }],
  "/work-orders/new": [HOME, { label: "Work orders", href: "/work-orders" }, { label: "New" }],
  "/designs": [HOME, { label: "Designs" }],
  "/designs/new": [HOME, { label: "Designs", href: "/designs" }, { label: "New design" }],
  "/motifs": [HOME, { label: "Motifs" }],
  "/production-runs": [HOME, { label: "Production runs" }],
  "/production-runs/new": [HOME, { label: "Production runs", href: "/production-runs" }, { label: "New run" }],
  "/stock-transfer": [HOME, { label: "Stock transfer", href: "/stock-transfer" }, { label: "Scan & send" }],
  "/stock-transfer/sent": [HOME, { label: "Stock transfer", href: "/stock-transfer" }, { label: "Sent" }],
  "/stock-transfer/proforma": [HOME, { label: "Stock transfer", href: "/stock-transfer" }, { label: "Proforma list" }],
  "/stock-transfer/incoming": [HOME, { label: "Stock transfer", href: "/stock-transfer" }, { label: "Incoming" }],
  "/branches": [HOME, { label: "Branches" }],
  "/settings": [HOME, { label: "Settings" }],
  "/sales-analytics": [HOME, { label: "Reports", href: "/sales-analytics" }, { label: "Sales analytics" }],
  "/reports/gst": [HOME, { label: "Reports", href: "/sales-analytics" }, { label: "GST report" }],
  "/reports/stock-valuation": [HOME, { label: "Reports", href: "/sales-analytics" }, { label: "Stock valuation" }],
  "/reports/ageing-stock": [HOME, { label: "Reports", href: "/sales-analytics" }, { label: "Ageing stock" }],
  "/reports/staff-performance": [HOME, { label: "Reports", href: "/sales-analytics" }, { label: "Staff performance" }],
};

function resolveTrail(pathname: string): Segment[] {
  if (ROUTE_TRAILS[pathname]) {
    return ROUTE_TRAILS[pathname];
  }

  if (pathname.match(/^\/stock-transfer\/sent\/[^/]+$/)) {
    return [
      HOME,
      { label: "Stock transfer", href: "/stock-transfer" },
      { label: "Sent", href: "/stock-transfer/sent" },
      { label: "Transfer detail" },
    ];
  }

  if (pathname.match(/^\/inventory\/[^/]+\/edit$/)) {
    return [
      HOME,
      { label: "All stock", href: "/inventory" },
      { label: "Edit product" },
    ];
  }

  if (pathname.match(/^\/customers\/[^/]+\/edit$/)) {
    return [
      HOME,
      { label: "Customers", href: "/customers" },
      { label: "Edit customer" },
    ];
  }

  if (pathname.match(/^\/production-runs\/[^/]+$/) && pathname !== "/production-runs/new") {
    return [
      HOME,
      { label: "Production runs", href: "/production-runs" },
      { label: "Run detail" },
    ];
  }

  return [HOME, { label: "Page" }];
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = resolveTrail(pathname);

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
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span
            key={`${segment.label}-${i}`}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {i > 0 && (
              <span style={{ color: "var(--text-muted)" }}>/</span>
            )}
            {isLast ? (
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                {segment.label}
              </span>
            ) : (
              <Link
                href={segment.href ?? "/dashboard"}
                style={{ color: "var(--accent)", textDecoration: "none" }}
              >
                {segment.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
