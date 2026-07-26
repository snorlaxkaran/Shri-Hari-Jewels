"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Gem, Inbox, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

const NAV = [
  { href: "/platform/companies", label: "Companies", icon: Building2 },
  { href: "/platform/demo-requests", label: "Demo requests", icon: Inbox },
] as const;

export default function PlatformHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header
      className="border-b px-6 py-4"
      style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="brand-mark w-10 h-10 rounded-lg">
            <Gem size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-display text-lg font-semibold">Jewellery ERP</p>
            <p className="text-xs text-[var(--text-muted)]">Platform administration</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-lg border p-1 text-sm" style={{ borderColor: "var(--border)" }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                  active
                    ? "bg-[var(--bg-page)] font-medium text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--text-muted)] hidden sm:inline">
            {user?.email}
          </span>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border"
            style={{ borderColor: "var(--border)" }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
