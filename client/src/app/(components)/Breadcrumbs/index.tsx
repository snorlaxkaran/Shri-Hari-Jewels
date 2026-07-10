"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { getBreadcrumbs } from "@/lib/navigation";

export default function Breadcrumbs() {
  const pathname = usePathname();

  const crumbs = useMemo(() => getBreadcrumbs(pathname), [pathname]);

  if (pathname === "/login" || pathname.startsWith("/platform")) {
    return null;
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {index > 0 && <span className="breadcrumbs-sep">›</span>}
            {crumb.href && !isLast ? (
              <Link href={crumb.href}>{crumb.label}</Link>
            ) : (
              <span style={{ color: isLast ? "var(--text-primary)" : undefined }}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
