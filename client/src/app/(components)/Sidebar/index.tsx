"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canAccessRoute,
  canViewStockTransfers,
} from "@/lib/auth/permissions";
import { filterNavSections } from "@/lib/navigation";
import { fetchIncomingTransferCount } from "@/lib/api/inventory";

type SidebarContentProps = {
  pathname: string;
  onClose: () => void;
  showClose?: boolean;
};

const SidebarContent = ({
  pathname,
  onClose,
  showClose = false,
}: SidebarContentProps) => {
  const router = useRouter();
  const prefetchedRoutes = useRef(new Set<string>());
  const { user } = useAuth();
  const [incomingCount, setIncomingCount] = useState<number | undefined>();

  const sections = useMemo(() => {
    if (!user) return [];
    const base = filterNavSections((href) => canAccessRoute(user.role, href));
    if (incomingCount == null || incomingCount <= 0) return base;
    return base.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.href === "/stock-transfer/incoming"
          ? { ...item, badge: incomingCount }
          : item,
      ),
    }));
  }, [user, incomingCount]);

  useEffect(() => {
    if (!user || !canViewStockTransfers(user.role)) return;
    fetchIncomingTransferCount()
      .then(setIncomingCount)
      .catch(() => setIncomingCount(undefined));
  }, [user, pathname]);

  const prefetchRoute = useCallback(
    (href: string) => {
      if (prefetchedRoutes.current.has(href)) return;
      prefetchedRoutes.current.add(href);
      router.prefetch(href);
    },
    [router],
  );

  return (
    <div
      className="flex flex-col h-full w-[220px] overflow-y-auto"
      style={{
        backgroundColor: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {showClose && (
        <div className="flex justify-end px-3 pt-2">
          <button
            className="p-1 transition-colors"
            style={{ color: "var(--sidebar-text)" }}
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <nav className="flex-1" style={{ paddingTop: 8 }}>
        {sections.map((section, si) => (
          <div key={section.title}>
            {si !== 0 && (
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.06)",
                  margin: "8px 0",
                }}
              />
            )}
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#879596",
                padding: "12px 16px 4px",
              }}
            >
              {section.title}
            </p>

            {section.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const badge = item.badge;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onPointerEnter={() => prefetchRoute(item.href)}
                  onFocus={() => prefetchRoute(item.href)}
                  onClick={() => {
                    prefetchRoute(item.href);
                    onClose();
                  }}
                  data-active={isActive}
                  className="sidebar-nav-item w-full flex items-center text-left transition-colors duration-150"
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    padding: "7px 16px",
                    gap: 8,
                    borderRadius: 0,
                    color: isActive
                      ? "var(--sidebar-text-active)"
                      : "var(--sidebar-text)",
                  }}
                >
                  <span className="sidebar-nav-icon flex-shrink-0 w-[16px] flex justify-center">
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {badge !== undefined && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: 2,
                        background: isActive
                          ? "rgba(255, 153, 0, 0.25)"
                          : "rgba(255, 255, 255, 0.1)",
                        color: isActive ? "#ffffff" : "var(--sidebar-text)",
                      }}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
};

type SidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const Sidebar = ({ mobileOpen, onMobileClose }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden md:flex flex-shrink-0 h-full">
        <SidebarContent pathname={pathname} onClose={() => {}} />
      </aside>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 flex"
          style={{ top: "var(--topbar-height)" }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={onMobileClose}
          />
          <aside className="relative z-10 h-full">
            <SidebarContent
              pathname={pathname}
              onClose={onMobileClose}
              showClose
            />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
