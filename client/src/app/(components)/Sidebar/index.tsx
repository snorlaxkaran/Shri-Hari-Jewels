"use client";

import { X, Home } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import SidebarNavSearch, {
  filterNavSectionsByQuery,
  flattenNavMatches,
  rankNavMatches,
  SidebarNavSearchResults,
} from "@/app/(components)/Sidebar/SidebarNavSearch";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canAccessRoute,
  canManageCustomers,
  canManageExpenses,
  canViewRepairs,
  canViewHallmark,
  canViewStockTransfers,
  isMasterAdmin,
} from "@/lib/auth/permissions";
import { filterNavSections, primaryNavItems } from "@/lib/navigation";
import { fetchIncomingTransferCount } from "@/lib/api/inventory";
import { fetchFollowUpsDueCount } from "@/lib/api/leads";
import { fetchReadyForPickupCount } from "@/lib/api/repairs";
import { fetchHallmarkPendingCount } from "@/lib/api/hallmark";
import { fetchExpensesPendingCount } from "@/lib/api/expenses";

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
  const [followUpsDueCount, setFollowUpsDueCount] = useState<number | undefined>();
  const [readyForPickupCount, setReadyForPickupCount] = useState<number | undefined>();
  const [hallmarkPendingCount, setHallmarkPendingCount] = useState<number | undefined>();
  const [expensesPendingCount, setExpensesPendingCount] = useState<number | undefined>();
  const [navQuery, setNavQuery] = useState("");

  const sections = useMemo(() => {
    if (!user) return [];
    const base = filterNavSections((href) => canAccessRoute(user.role, href));
    return base.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.href === "/stock-transfer/incoming" && incomingCount != null && incomingCount > 0) {
          return { ...item, badge: incomingCount };
        }
        if (item.href === "/leads" && followUpsDueCount != null && followUpsDueCount > 0) {
          return { ...item, badge: followUpsDueCount };
        }
        if (item.href === "/repairs" && readyForPickupCount != null && readyForPickupCount > 0) {
          return { ...item, badge: readyForPickupCount };
        }
        if (item.href === "/hallmark" && hallmarkPendingCount != null && hallmarkPendingCount > 0) {
          return { ...item, badge: hallmarkPendingCount };
        }
        if (item.href === "/expenses" && expensesPendingCount != null && expensesPendingCount > 0) {
          return { ...item, badge: expensesPendingCount };
        }
        return item;
      }),
    }));
  }, [user, incomingCount, followUpsDueCount, readyForPickupCount, hallmarkPendingCount, expensesPendingCount]);

  const setupNavItem = useMemo(
    () =>
      user && isMasterAdmin(user.role)
        ? [{ label: "Setup wizard", href: "/setup", icon: <span>⚙</span> }]
        : [],
    [user],
  );

  const accessiblePrimary = useMemo(
    () => primaryNavItems.filter((item) => user && canAccessRoute(user.role, item.href)),
    [user],
  );

  const filteredNav = useMemo(
    () =>
      filterNavSectionsByQuery(sections, accessiblePrimary, navQuery, setupNavItem),
    [sections, accessiblePrimary, navQuery, setupNavItem],
  );

  const navMatches = useMemo(() => {
    const flat = flattenNavMatches(sections, accessiblePrimary, setupNavItem);
    return rankNavMatches(flat, navQuery);
  }, [sections, accessiblePrimary, setupNavItem, navQuery]);

  const isFiltering = navQuery.trim().length > 0;

  useEffect(() => {
    if (!user || !canViewStockTransfers(user.role)) return;
    fetchIncomingTransferCount()
      .then(setIncomingCount)
      .catch(() => setIncomingCount(undefined));
  }, [user]);

  useEffect(() => {
    if (!user || !canManageCustomers(user.role)) return;
    fetchFollowUpsDueCount()
      .then(setFollowUpsDueCount)
      .catch(() => setFollowUpsDueCount(undefined));
  }, [user]);

  useEffect(() => {
    if (!user || !canViewRepairs(user.role)) return;
    fetchReadyForPickupCount()
      .then(setReadyForPickupCount)
      .catch(() => setReadyForPickupCount(undefined));
  }, [user]);

  useEffect(() => {
    if (!user || !canViewHallmark(user.role)) return;
    fetchHallmarkPendingCount()
      .then(setHallmarkPendingCount)
      .catch(() => setHallmarkPendingCount(undefined));
  }, [user]);

  useEffect(() => {
    if (!user || !canManageExpenses(user.role)) return;
    fetchExpensesPendingCount()
      .then(setExpensesPendingCount)
      .catch(() => setExpensesPendingCount(undefined));
  }, [user]);

  const prefetchRoute = useCallback(
    (href: string) => {
      if (prefetchedRoutes.current.has(href)) return;
      prefetchedRoutes.current.add(href);
      router.prefetch(href);
    },
    [router],
  );

  const renderNavLink = (item: { label: string; href: string; icon: React.ReactNode; badge?: string | number }) => {
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
          fontWeight: isActive ? 500 : 400,
          padding: "7px 16px",
          gap: 8,
          color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
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
              background: isActive ? "var(--accent-light)" : "var(--bg-subtle)",
              color: isActive ? "var(--accent)" : "var(--sidebar-text)",
            }}
          >
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div
      className="sidebar-shell flex flex-col h-full"
      style={{
        width: "var(--sidebar-width)",
        backgroundColor: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {showClose && (
        <div className="flex justify-end px-3 pt-2 shrink-0">
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

      <div className="sidebar-search shrink-0">
        <SidebarNavSearch
          value={navQuery}
          onChange={setNavQuery}
        />
      </div>

      <nav className="sidebar-nav-scroll flex-1 min-h-0" style={{ paddingTop: 8 }}>
        {isFiltering ? (
          <SidebarNavSearchResults
            matches={navMatches}
            pathname={pathname}
            onNavigate={onClose}
            onClear={() => setNavQuery("")}
          />
        ) : (
          <>
        <div className="px-4 pb-2">
          {filteredNav.primaryItems.map((item) => renderNavLink(item))}
          {filteredNav.extras.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="sidebar-nav-item w-full flex items-center text-left transition-colors duration-150"
              style={{
                fontSize: 12,
                padding: "6px 16px",
                gap: 8,
                color:
                  pathname === item.href
                    ? "var(--sidebar-text-active)"
                    : "var(--sidebar-text)",
              }}
            >
              <span className="w-[16px] flex justify-center">⚙</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {filteredNav.sections.map((section, si) => (
          <div key={section.title}>
            {si !== 0 && (
              <div
                style={{
                  height: 1,
                  background: "var(--border)",
                  margin: "8px 0",
                }}
              />
            )}
            {section.workspaceHref && user && canAccessRoute(user.role, section.workspaceHref) ? (
              <Link
                href={section.workspaceHref}
                onClick={onClose}
                className="flex items-center gap-2 px-4 pt-3 pb-1 group"
              >
                <Home size={12} style={{ color: "var(--sidebar-text)" }} />
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: pathname === section.workspaceHref ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                  }}
                >
                  {section.title}
                </p>
              </Link>
            ) : (
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#525252",
                  padding: "12px 16px 4px",
                }}
              >
                {section.title}
              </p>
            )}

            {section.items.map((item) => renderNavLink(item))}
          </div>
        ))}
          </>
        )}
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
