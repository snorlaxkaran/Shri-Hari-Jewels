"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessRoute } from "@/lib/auth/permissions";
import { filterNavSections } from "@/lib/navigation";

export default function WorkspaceDock() {
  const pathname = usePathname();
  const { user } = useAuth();

  const sections = useMemo(() => {
    if (!user) return [];
    return filterNavSections((href) => canAccessRoute(user.role, href)).filter(
      (s) => s.workspaceHref,
    );
  }, [user]);

  if (sections.length === 0) return null;

  return (
    <aside className="workspace-dock hidden lg:flex" aria-label="Module workspaces">
      {sections.map((section) => {
        const href = section.workspaceHref!;
        const isActive =
          pathname === href || pathname.startsWith(`${href}/`) ||
          section.items.some(
            (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
          );
        const Icon = section.items[0]?.icon;
        return (
          <Link
            key={section.title}
            href={href}
            className="workspace-dock-item"
            data-active={isActive}
            title={section.title}
          >
            <span className="workspace-dock-icon">{Icon}</span>
          </Link>
        );
      })}
    </aside>
  );
}
