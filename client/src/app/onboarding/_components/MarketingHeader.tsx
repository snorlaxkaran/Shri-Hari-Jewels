import Link from "next/link";
import { ChevronDown, Gem } from "lucide-react";
import { SHOWCASE_MODULES } from "@/lib/onboarding/modules-showcase";

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#modules", label: "Modules" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#e5e7eb]">
      <div className="erp-marketing-shell h-12 flex items-center justify-between gap-4">
        <Link href="/onboarding" className="erp-auth-brand shrink-0">
          <span className="erp-auth-brand-mark">
            <Gem size={16} />
          </span>
          Shri Hari Jewels
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="erp-auth-nav-link px-3 py-2">
              {item.label}
            </a>
          ))}
          <div className="relative group">
            <button
              type="button"
              className="erp-auth-nav-link px-3 py-2 inline-flex items-center gap-1"
            >
              All modules
              <ChevronDown size={14} />
            </button>
            <div className="absolute top-full left-0 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="bg-white border border-[#e5e7eb] rounded-lg shadow-lg py-2 min-w-[200px]">
                {SHOWCASE_MODULES.map((mod) => (
                  <Link
                    key={mod.id}
                    href={mod.knowMoreHref}
                    className="block px-4 py-2 text-sm text-[#404040] hover:bg-[#f9fafb] hover:text-[#171717]"
                  >
                    {mod.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <nav className="erp-auth-nav-actions">
          <Link href="/login" className="erp-auth-nav-link hidden sm:inline">
            Sign in
          </Link>
          <Link href="/onboarding/start" className="erp-btn-primary w-auto px-4 shrink-0">
            Start free trial
          </Link>
        </nav>
      </div>
    </header>
  );
}
