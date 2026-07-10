"use client";

import { ChevronDown, Gem, LogOut, Menu, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canAccessRoute,
  ROLE_LABELS,
} from "@/lib/auth/permissions";
import {
  filterNavSections,
  getNavSectionForPath,
  getPageTitle,
  type NavSection,
} from "@/lib/navigation";
import { fetchUserBranches } from "@/lib/api/branches";
import type { Branch } from "@/lib/types";

type TopBarProps = {
  onMenuClick: () => void;
};

const TopBar = ({ onMenuClick }: TopBarProps) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => {
    if (!user) return [];
    return filterNavSections((href) => canAccessRoute(user.role, href));
  }, [user]);

  const activeSection = useMemo(
    () => getNavSectionForPath(pathname),
    [pathname],
  );

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);

  useEffect(() => {
    if (!user) return;
    fetchUserBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [user]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const branchLabel = useMemo(() => {
    if (branches.length === 0) return user?.organizationName ?? "Branch";
    if (branches.length === 1) return branches[0].name;
    if (user?.role === "Admin" || user?.role === "SuperAdmin") {
      return "All locations";
    }
    return branches.map((branch) => branch.name).join(", ");
  }, [branches, user]);

  const sectionHref = useCallback((section: NavSection) => {
    return section.items[0]?.href ?? "/dashboard";
  }, []);

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-btn md:hidden"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <Menu size={16} />
      </button>

      <Link href="/dashboard" className="topbar-brand">
        <Gem size={16} style={{ color: "var(--accent-orange)" }} />
        <span>Shri Hari Jewels</span>
      </Link>

      <div className="topbar-divider" />

      <nav className="topbar-nav" aria-label="Primary sections">
        {sections.map((section) => {
          const isActive = activeSection?.title === section.title;
          return (
            <Link
              key={section.title}
              href={sectionHref(section)}
              data-active={isActive}
              className="topbar-nav-item"
              title={section.title}
            >
              {isActive ? pageTitle : section.title}
            </Link>
          );
        })}
      </nav>

      <div className="topbar-actions">
        <div className="topbar-divider" />

        <div
          className="topbar-btn"
          style={{ cursor: "default", pointerEvents: "none" }}
          title="Current branch scope"
        >
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Branch</span>
          <span>{branchLabel}</span>
        </div>

        <div className="topbar-divider" />

        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="topbar-btn"
            onClick={() => setUserMenuOpen((open) => !open)}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
          >
            <span
              className="avatar"
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                fontSize: 11,
              }}
            >
              {initial}
            </span>
            <span className="hidden sm:inline">{user?.name ?? "User"}</span>
            <ChevronDown size={14} />
          </button>

          {userMenuOpen && (
            <div
              role="menu"
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                minWidth: 200,
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 60,
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {user?.name}
                </p>
                {user && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {ROLE_LABELS[user.role]}
                  </p>
                )}
              </div>
              <Link
                href="/settings"
                className="topbar-btn"
                style={{
                  width: "100%",
                  height: 36,
                  color: "var(--text-primary)",
                  justifyContent: "flex-start",
                  padding: "0 14px",
                }}
                onClick={() => setUserMenuOpen(false)}
              >
                <Settings size={15} />
                Settings
              </Link>
              <button
                type="button"
                className="topbar-btn"
                style={{
                  width: "100%",
                  height: 36,
                  color: "var(--text-primary)",
                  justifyContent: "flex-start",
                  padding: "0 14px",
                }}
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
