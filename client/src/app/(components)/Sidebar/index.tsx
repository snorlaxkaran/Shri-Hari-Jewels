"use client";

import { Gem, MoreVertical, X } from "lucide-react";

import Link from "next/link";

import { useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-context";

import { canAccessRoute, ROLE_LABELS } from "@/lib/auth/permissions";

import { filterNavSections } from "@/lib/navigation";

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

  const { user, logout } = useAuth();

  const sections = useMemo(
    () =>
      user ? filterNavSections((href) => canAccessRoute(user.role, href)) : [],
    [user],
  );

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
      className="flex flex-col h-full w-[260px] overflow-y-auto border-r"
      style={{
        backgroundColor: "var(--sidebar-bg)",

        borderColor: "var(--sidebar-border)",
      }}
    >
      <div
        className="px-5 pt-6 pb-5 flex items-center gap-3 border-b"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <div className="w-9 h-9 rounded-lg brand-mark">
          <Gem size={18} strokeWidth={1.5} />
        </div>

        <div>
          <p className="text-sm font-display text-white leading-tight">
            Shree Hari
          </p>

          <p
            className="text-[10px] tracking-[0.14em] uppercase"
            style={{ color: "var(--sidebar-text)" }}
          >
            Jewels ERP
          </p>
        </div>

        {showClose && (
          <button
            className="ml-auto p-1 rounded-md hover:bg-white/10 transition-colors"
            style={{ color: "var(--sidebar-text)" }}
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {sections.map((section, si) => (
          <div key={section.title} className={si !== 0 ? "pt-4" : ""}>
            {si !== 0 && (
              <div
                className="mb-3 mx-2 border-t"
                style={{ borderColor: "var(--sidebar-border)" }}
              />
            )}

            <p
              className="text-[10px] font-medium tracking-wider uppercase px-2 mb-2"
              style={{ color: "var(--sidebar-text)", opacity: 0.75 }}
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
                  className="sidebar-nav-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] font-medium transition-colors duration-150"
                  style={{
                    color: isActive
                      ? "var(--sidebar-text-active)"
                      : "var(--sidebar-text)",
                  }}
                >
                  <span className="sidebar-nav-icon flex-shrink-0 w-[18px] flex justify-center">
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

      <div
        className="px-3 py-4 border-t"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "var(--sidebar-text)" }}
        >
          <div className="w-8 h-8 rounded-full avatar text-xs flex-shrink-0">
            {user?.name?.charAt(0) ?? "?"}
          </div>

          <div className="flex-1 text-left min-w-0">
            <p className="text-[12.5px] font-medium truncate text-white">
              {user?.name ?? "User"}
            </p>

            <p className="text-[11px]" style={{ color: "var(--sidebar-text)" }}>
              {user ? ROLE_LABELS[user.role] : ""}
            </p>
          </div>

          <MoreVertical size={15} className="flex-shrink-0 opacity-40" />
        </button>
      </div>
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
      <aside className="hidden md:flex h-screen sticky top-0 flex-shrink-0">
        <SidebarContent pathname={pathname} onClose={() => {}} />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
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
