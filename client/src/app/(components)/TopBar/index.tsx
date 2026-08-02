"use client";

import { Bell, ChevronDown, Gem, LogOut, Menu, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GlobalSearch from "@/app/(components)/GlobalSearch";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessRoute, ROLE_LABELS } from "@/lib/auth/permissions";
import {
  fetchNotifications,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/lib/api/notifications";
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => {
    if (!user) return [];
    return filterNavSections((href) => canAccessRoute(user.role, href));
  }, [user]);

  const activeSection = useMemo(() => getNavSectionForPath(pathname), [pathname]);
  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      /* silent */
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchUserBranches().then(setBranches).catch(() => setBranches([]));
  }, [user]);

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(() => void loadNotifications(), 60_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const branchLabel = useMemo(() => {
    if (branches.length === 0) return user?.organizationName ?? "Branch";
    if (branches.length === 1) return branches[0].name;
    if (user?.role === "Admin" || user?.role === "SuperAdmin") return "All locations";
    return branches.map((branch) => branch.name).join(", ");
  }, [branches, user]);

  const sectionHref = useCallback((section: NavSection) => {
    return section.workspaceHref ?? section.items[0]?.href ?? "/dashboard";
  }, []);

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <header className="topbar">
      <button type="button" className="topbar-btn md:hidden" onClick={onMenuClick} aria-label="Toggle menu">
        <Menu size={16} />
      </button>

      <Link href="/dashboard" className="topbar-brand">
        <Gem size={16} className="topbar-brand-icon" />
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

      <div className="topbar-divider hidden lg:block" />

      <div className="topbar-search hidden md:block">
        <GlobalSearch />
      </div>

      <div className="topbar-actions">
        <div className="topbar-divider" />

        <div className="topbar-btn topbar-branch" title="Current branch scope">
          <span className="topbar-branch-label">Branch</span>
          <span>{branchLabel}</span>
        </div>

        <div className="topbar-divider" />

        <div ref={notifRef} className="topbar-popover-wrap">
          <button
            type="button"
            className="topbar-btn topbar-notif-btn"
            aria-label="Notifications"
            onClick={() => {
              setNotificationsOpen((v) => !v);
              void loadNotifications();
            }}
          >
            <Bell size={16} />
            {unreadCount > 0 && <span className="topbar-notif-dot" />}
          </button>
          {notificationsOpen && (
            <div className="topbar-popover topbar-notif-panel">
              <div className="topbar-popover-head">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="topbar-popover-action"
                    onClick={() => void markAllNotificationsRead().then(loadNotifications)}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="topbar-notif-list">
                {notifications.length === 0 ? (
                  <p className="topbar-notif-empty">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="topbar-notif-item">
                      <p className="topbar-notif-title">{n.title}</p>
                      {n.message && <p className="topbar-notif-body">{n.message}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={menuRef} className="topbar-popover-wrap">
          <button
            type="button"
            className="topbar-btn"
            onClick={() => setUserMenuOpen((open) => !open)}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
          >
            <span className="topbar-avatar">{initial}</span>
            <span className="hidden sm:inline">{user?.name ?? "User"}</span>
            <ChevronDown size={14} />
          </button>

          {userMenuOpen && (
            <div role="menu" className="topbar-popover topbar-user-menu">
              <div className="topbar-popover-head topbar-user-head">
                <p className="topbar-user-name">{user?.name}</p>
                {user && <p className="topbar-user-role">{ROLE_LABELS[user.role]}</p>}
              </div>
              <Link href="/settings" className="topbar-menu-item" onClick={() => setUserMenuOpen(false)}>
                <Settings size={15} />
                Settings
              </Link>
              <button
                type="button"
                className="topbar-menu-item"
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
