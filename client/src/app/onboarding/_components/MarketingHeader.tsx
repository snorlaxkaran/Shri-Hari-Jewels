import Link from "next/link";
import { Gem } from "lucide-react";

const NAV = [
  { href: "#modules", label: "Modules" },
  { href: "#features", label: "Features" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#compare", label: "Compare" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingHeader() {
  return (
    <header className="mkt-header">
      <div className="mkt-shell mkt-header-inner">
        <Link href="/onboarding" className="mkt-brand">
          <span className="mkt-brand-mark">
            <Gem size={14} />
          </span>
          Shri Hari Jewels
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="mkt-nav-link">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/login" className="mkt-btn mkt-btn-ghost hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/onboarding/start" className="mkt-btn mkt-btn-dark text-sm px-4">
            Start free trial
          </Link>
        </div>
      </div>
    </header>
  );
}
