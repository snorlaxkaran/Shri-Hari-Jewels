"use client";

import { Bell, Menu, Search, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import {
  fetchNotifications,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/lib/api/notifications";
import { globalSearch, type SearchResult } from "@/lib/api/search";

type NavbarProps = {
  onMenuClick: () => void;
};

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useAuth();
  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?";
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent — navbar should not break on notification fetch failure
    }
  }, [user]);

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(() => void loadNotifications(), 60_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchValue.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await globalSearch(searchValue.trim());
        setSearchResults(results);
        setShowSearch(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchValue]);

  const handleNotificationClick = async () => {
    setShowNotifications((v) => !v);
    if (!showNotifications) {
      await loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await loadNotifications();
  };

  return (
    <div className="flex justify-between items-center w-full mb-6">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-2 rounded-lg surface-card transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 150)}
            placeholder="Search products, designs, orders…"
            className="input-field pl-9 pr-4 py-2 text-sm w-52 md:w-80 transition-all duration-150"
          />
          {showSearch && searchResults.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border shadow-lg overflow-hidden"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border)",
              }}
            >
              {searchResults.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-black/5"
                  onMouseDown={() => {
                    router.push(r.href);
                    setShowSearch(false);
                    setSearchValue("");
                  }}
                >
                  <span className="font-medium">{r.label}</span>
                  {r.sublabel && (
                    <span
                      className="ml-2 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {r.type} · {r.sublabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="hidden md:flex items-center gap-1">
          <div className="relative">
            <button
              className="relative p-2 rounded-lg transition-colors hover:bg-white/80"
              style={{ color: "var(--text-muted)" }}
              aria-label="Notifications"
              onClick={() => void handleNotificationClick()}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
            {showNotifications && (
              <div
                className="absolute right-0 top-full mt-1 w-80 z-50 rounded-lg border shadow-lg"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
                  <span className="text-sm font-medium">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="text-xs"
                      style={{ color: "var(--accent)" }}
                      onClick={() => void handleMarkAllRead()}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-4 text-sm" style={{ color: "var(--text-muted)" }}>
                      No notifications
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="px-3 py-2 border-b text-sm"
                        style={{
                          borderColor: "var(--border)",
                          opacity: n.read ? 0.7 : 1,
                        }}
                      >
                        <p className="font-medium">{n.title}</p>
                        <p style={{ color: "var(--text-muted)" }}>{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            className="h-6 w-px mx-2"
            style={{ backgroundColor: "var(--border)" }}
          />

          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
            <div className="w-8 h-8 rounded-full avatar text-xs">
              {initial}
            </div>
            <div className="text-left">
              <p
                className="text-sm font-medium leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {user?.name ?? "User"}
              </p>
              {user && (
                <p
                  className="text-[11px] leading-tight"
                  style={{ color: "var(--text-muted)" }}
                >
                  {ROLE_LABELS[user.role]}
                </p>
              )}
            </div>
          </div>
        </div>

        <Link href="/settings">
          <button
            className="p-2 rounded-lg transition-colors hover:bg-white/80"
            style={{ color: "var(--text-muted)" }}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </Link>

        <button
          className="p-2 rounded-lg transition-colors md:hidden hover:bg-white/80 relative"
          style={{ color: "var(--text-muted)" }}
          aria-label="Notifications"
          onClick={() => void handleNotificationClick()}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>
      </div>
    </div>
  );
};

export default Navbar;
