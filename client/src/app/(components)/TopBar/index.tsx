"use client";

import {
  BarChart2,
  Bell,
  Briefcase,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Factory,
  FileText,
  Gem,
  LogOut,
  Menu,
  Package,
  PackageOpen,
  Palette,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { fetchUserBranches } from "@/lib/api/branches";
import {
  fetchNotifications,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/lib/api/notifications";
import { globalSearch, type SearchResult } from "@/lib/api/search";
import type { Branch } from "@/lib/types";

const BRANCH_STORAGE_KEY = "shj_active_branch_id";

type TopBarProps = {
  onMenuClick: () => void;
};

type MegaMenuItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type MegaMenuColumn = {
  title: string;
  items: MegaMenuItem[];
};

const MEGA_MENU: MegaMenuColumn[] = [
  {
    title: "Inventory & Stock",
    items: [
      { label: "Products", href: "/inventory", icon: <Package size={16} /> },
      { label: "Add Units", href: "/inventory/add-units", icon: <Package size={16} /> },
      { label: "Entry Verification", href: "/entry-verification", icon: <ClipboardCheck size={16} /> },
      { label: "Raw Materials", href: "/raw-inventory", icon: <Gem size={16} /> },
    ],
  },
  {
    title: "Sales & Orders",
    items: [
      { label: "Sales", href: "/sales", icon: <ShoppingCart size={16} /> },
      { label: "Orders", href: "/orders", icon: <ShoppingBag size={16} /> },
      { label: "Work Orders", href: "/work-orders", icon: <Briefcase size={16} /> },
      { label: "Customers", href: "/customers", icon: <Users size={16} /> },
      { label: "Invoices", href: "/invoices", icon: <FileText size={16} /> },
    ],
  },
  {
    title: "Production & Reports",
    items: [
      { label: "Designs", href: "/designs", icon: <Palette size={16} /> },
      { label: "Motifs", href: "/motifs", icon: <Gem size={16} /> },
      { label: "Production Runs", href: "/production-runs", icon: <Factory size={16} /> },
      { label: "Sales Analytics", href: "/sales-analytics", icon: <BarChart2 size={16} /> },
      { label: "GST Report", href: "/reports/gst", icon: <FileText size={16} /> },
      { label: "Stock Valuation", href: "/reports/stock-valuation", icon: <Gem size={16} /> },
    ],
  },
];

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose, enabled]);
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?";
  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? branches[0];

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(() => void loadNotifications(), 60_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (!user) return;
    fetchUserBranches()
      .then((data) => {
        setBranches(data);
        const stored = sessionStorage.getItem(BRANCH_STORAGE_KEY);
        const match = stored ? data.find((b) => b.id === stored) : undefined;
        const selected = match ?? data[0];
        if (selected) {
          setActiveBranchId(selected.id);
          sessionStorage.setItem(BRANCH_STORAGE_KEY, selected.id);
        }
      })
      .catch(() => setBranches([]));
  }, [user]);

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setShowServices(false);
        setShowBranchMenu(false);
        setShowUserMenu(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useClickOutside(servicesRef, () => setShowServices(false), showServices);
  useClickOutside(branchRef, () => setShowBranchMenu(false), showBranchMenu);
  useClickOutside(userRef, () => setShowUserMenu(false), showUserMenu);
  useClickOutside(notifRef, () => setShowNotifications(false), showNotifications);

  const handleBranchSelect = (branch: Branch) => {
    setActiveBranchId(branch.id);
    sessionStorage.setItem(BRANCH_STORAGE_KEY, branch.id);
    setShowBranchMenu(false);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await loadNotifications();
  };

  return (
    <header className="topbar">
      {/* Left zone */}
      <button
        type="button"
        className="topbar-btn md:hidden"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <Menu size={16} />
      </button>

      <div className="topbar-btn" style={{ cursor: "default", gap: 7 }}>
        <Gem size={16} style={{ color: "#e0920a" }} />
        <span style={{ color: "#fff", fontSize: 13.5, fontWeight: 600 }}>
          Shri Hari ERP
        </span>
      </div>

      <div className="topbar-divider" />

      <div ref={servicesRef} style={{ position: "relative", height: "100%" }}>
        <button
          type="button"
          className="topbar-btn"
          onClick={() => setShowServices((v) => !v)}
        >
          Services <ChevronDown size={12} />
        </button>
        {showServices && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 4,
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: 6,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              zIndex: 100,
              padding: 16,
              display: "grid",
              gridTemplateColumns: "repeat(3, 200px)",
              gap: 16,
            }}
          >
            {MEGA_MENU.map((col) => (
              <div key={col.title}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {col.title}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {col.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowServices(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        borderRadius: 4,
                        fontSize: 13,
                        color: "var(--text-primary)",
                        textDecoration: "none",
                      }}
                      className="mega-menu-item"
                    >
                      <span style={{ color: "var(--text-muted)" }}>{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-divider" />

      {/* Center zone */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 16px" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(255,255,255,0.4)",
              pointerEvents: "none",
            }}
          />
          <input
            ref={searchRef}
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 150)}
            placeholder="Search items, customers, invoices… (⌘K)"
            className="topbar-search"
          />
          {showSearch && searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 4,
                zIndex: 100,
                borderRadius: 6,
                border: "1px solid var(--border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                overflow: "hidden",
                background: "var(--bg-surface)",
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
                    <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)" }}>
                      {r.type} · {r.sublabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right zone */}
      <div className="topbar-divider" />

      <div ref={branchRef} style={{ position: "relative", height: "100%" }}>
        <button
          type="button"
          className="topbar-btn"
          onClick={() => setShowBranchMenu((v) => !v)}
        >
          <Building2 size={14} />
          <span style={{ color: "#e0920a", fontWeight: 700 }}>
            {activeBranch?.name ?? "Branch"}
          </span>
          <ChevronDown size={12} />
        </button>
        {showBranchMenu && branches.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 4,
              minWidth: 200,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              zIndex: 100,
              overflow: "hidden",
            }}
          >
            {branches.map((branch) => (
              <button
                key={branch.id}
                type="button"
                onClick={() => handleBranchSelect(branch)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 14px",
                  fontSize: 12.5,
                  background: branch.id === activeBranchId ? "var(--accent-muted)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: branch.id === activeBranchId ? "var(--accent)" : "var(--text-primary)",
                  fontWeight: branch.id === activeBranchId ? 600 : 400,
                }}
              >
                {branch.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-divider" />

      <div ref={notifRef} style={{ position: "relative", height: "100%" }}>
        <button
          type="button"
          className="topbar-btn"
          aria-label="Notifications"
          onClick={() => {
            setShowNotifications((v) => !v);
            if (!showNotifications) void loadNotifications();
          }}
        >
          <Bell size={15} />
          {unreadCount > 0 && (
            <span
              style={{
                background: "#dc2626",
                color: "#fff",
                fontSize: 10,
                fontWeight: 600,
                padding: "1px 5px",
                borderRadius: 10,
                lineHeight: 1.4,
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
        {showNotifications && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "100%",
              marginTop: 4,
              width: 320,
              zIndex: 100,
              borderRadius: 6,
              border: "1px solid var(--border)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              background: "var(--bg-surface)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500 }}>Notifications</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => void handleMarkAllRead()}
                >
                  Mark all read
                </button>
              )}
            </div>
            <div style={{ maxHeight: 256, overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <p style={{ padding: "16px 12px", fontSize: 13, color: "var(--text-muted)" }}>
                  No notifications
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 13,
                      opacity: n.read ? 0.7 : 1,
                    }}
                  >
                    <p style={{ fontWeight: 500 }}>{n.title}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12 }}>{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="topbar-divider" />

      <div ref={userRef} style={{ position: "relative", height: "100%" }}>
        <button
          type="button"
          className="topbar-btn"
          onClick={() => setShowUserMenu((v) => !v)}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2563eb, #1e3a8a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 600,
              color: "#fff",
            }}
          >
            {initial}
          </div>
          <span>{user?.name ?? "User"}</span>
          <ChevronDown size={12} />
        </button>
        {showUserMenu && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "100%",
              marginTop: 4,
              minWidth: 180,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              zIndex: 100,
              overflow: "hidden",
            }}
          >
            {user && (
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {ROLE_LABELS[user.role]}
                </p>
              </div>
            )}
            <Link
              href="/settings"
              onClick={() => setShowUserMenu(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                fontSize: 12.5,
                color: "var(--text-primary)",
                textDecoration: "none",
              }}
            >
              <User size={14} /> Profile
            </Link>
            <Link
              href="/settings"
              onClick={() => setShowUserMenu(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                fontSize: 12.5,
                color: "var(--text-primary)",
                textDecoration: "none",
              }}
            >
              <Settings size={14} /> Settings
            </Link>
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(false);
                logout();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                fontSize: 12.5,
                color: "#dc2626",
                background: "none",
                border: "none",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
