"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessRoute, canViewStockTransfers } from "@/lib/auth/permissions";
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
      className="flex flex-col h-full w-[220px] overflow-y-auto border-r"
      style={{
        backgroundColor: "var(--sidebar-bg)",
        borderColor: "var(--sidebar-border)",
      }}
    >
      {showClose && (
        <div className="flex justify-end px-3 pt-2">
          <button
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
            style={{ color: "var(--sidebar-text)" }}
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <nav className="flex-1 px-2" style={{ paddingTop: 8 }}>
        {sections.map((section, si) => (
          <div key={section.title}>
            {si !== 0 && (
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.06)",
                  margin: "8px 12px",
                }}
              />
            )}
            <p
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--sidebar-text)",
                opacity: si === 0 ? 0.6 : 0.6,
                padding: si === 0 ? "12px 12px 4px" : "12px 12px 4px",
              }}
            >
              {section.title}
            </p>

            {section.items.map((item) => {
              const isActive = pathname === item.href;
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
                  className="sidebar-nav-item w-full flex items-center text-left font-medium transition-colors duration-150"
                  style={{
                    fontSize: 12.5,
                    padding: "6px 14px",
                    gap: 7,
                    borderRadius: 5,
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
                      className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                      style={{
                        background: isActive
                          ? "rgb(37 99 235 / 0.35)"
                          : "rgb(255 255 255 / 0.1)",
                        color: isActive ? "#dbeafe" : "var(--sidebar-text)",
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
        <div className="md:hidden fixed inset-0 z-40 flex" style={{ top: "var(--topbar-height)" }}>
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="relative z-10 h-full shadow-2xl">
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
