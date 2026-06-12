"use client";

import { Bell, Menu, Search, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABELS } from "@/lib/auth/permissions";

type NavbarProps = {
  onMenuClick: () => void;
};

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const [searchValue, setSearchValue] = useState("");
  const { user } = useAuth();
  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?";

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
            placeholder="Search products…"
            className="input-field pl-9 pr-4 py-2 text-sm w-52 md:w-80 transition-all duration-150"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="hidden md:flex items-center gap-1">
          <button
            className="relative p-2 rounded-lg transition-colors hover:bg-white/80"
            style={{ color: "var(--text-muted)" }}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>

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
          className="p-2 rounded-lg transition-colors md:hidden hover:bg-white/80"
          style={{ color: "var(--text-muted)" }}
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Navbar;
