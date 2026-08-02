import Link from "next/link";
import { Gem } from "lucide-react";
import { FOOTER_LINKS } from "@/lib/onboarding/marketing-content";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#e5e7eb] bg-white">
      <div className="erp-marketing-shell py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link href="/onboarding" className="erp-auth-brand">
            <span className="erp-auth-brand-mark">
              <Gem size={16} />
            </span>
            Shri Hari Jewels
          </Link>
          <p className="mt-3 text-sm text-[#6b7280] leading-relaxed max-w-xs">
            Jewellery ERP with piece-level inventory, production floor, GST billing, and synced
            online store.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280] mb-3">Modules</p>
          <ul className="space-y-2">
            {FOOTER_LINKS.modules.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-[#525252] hover:text-[#171717]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280] mb-3">Product</p>
          <ul className="space-y-2">
            {FOOTER_LINKS.product.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm text-[#525252] hover:text-[#171717]">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280] mb-3">Account</p>
          <ul className="space-y-2">
            {FOOTER_LINKS.account.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-[#525252] hover:text-[#171717]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-[#e5e7eb] py-6">
        <div className="erp-marketing-shell flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#6b7280]">
          <p>© {new Date().getFullYear()} Shri Hari Jewels</p>
          <Link href="/shop/shree-hari-jewels" className="hover:text-[#171717]">
            Demo store →
          </Link>
        </div>
      </div>
    </footer>
  );
}
