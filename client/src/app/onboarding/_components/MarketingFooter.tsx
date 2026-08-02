import Link from "next/link";
import { Gem } from "lucide-react";
import { FOOTER_LINKS } from "@/lib/onboarding/marketing-content";

export function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-shell-wide grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <Link href="/onboarding" className="mkt-brand">
            <span className="mkt-brand-mark">
              <Gem size={14} />
            </span>
            Shri Hari Jewels
          </Link>
          <p className="mt-3 text-sm mkt-text-muted leading-relaxed max-w-xs">
            Jewellery ERP with piece-level inventory, production floor, and synced online store.
          </p>
        </div>

        <div>
          <p className="mkt-eyebrow mb-3">Modules</p>
          <ul className="space-y-2">
            {FOOTER_LINKS.modules.slice(0, 6).map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="mkt-footer-link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mkt-eyebrow mb-3">Product</p>
          <ul className="space-y-2">
            {FOOTER_LINKS.product.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="mkt-footer-link">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mkt-eyebrow mb-3">Account</p>
          <ul className="space-y-2">
            {FOOTER_LINKS.account.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="mkt-footer-link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mkt-shell-wide mkt-footer-bottom">
        <p>© {new Date().getFullYear()} Shri Hari Jewels</p>
        <Link href="/shop/shree-hari-jewels" className="mkt-footer-link">
          Demo store →
        </Link>
      </div>
    </footer>
  );
}
