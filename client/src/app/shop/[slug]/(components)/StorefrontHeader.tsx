"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Phone, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useStorefrontCart } from "@/lib/storefront/cart-context";
import type { StorefrontConfig } from "@/lib/storefront/types";
import TrustStrip from "./TrustStrip";

export default function StorefrontHeader({
  slug,
  config,
}: {
  slug: string;
  config: StorefrontConfig;
}) {
  const { itemCount } = useStorefrontCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const base = `/shop/${slug}`;
  const nav = [
    { label: "Home", href: base },
    { label: "Shop", href: `${base}/products` },
    { label: "Collections", href: `${base}/collections` },
    { label: "About", href: `${base}/about` },
  ];

  const whatsappHref = config.whatsappNumber
    ? `https://wa.me/91${config.whatsappNumber.replace(/\D/g, "")}`
    : null;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <TrustStrip />
      <header className="sf-header">
        <div className="sf-shell sf-header-inner">
          <Link href={base} className="sf-brand">
            {config.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logoUrl} alt={config.businessName} className="h-10 w-auto shrink-0" />
            ) : (
              <span className="sf-brand-mark">{config.businessName.charAt(0)}</span>
            )}
            <div className="min-w-0">
              <p className="sf-brand-name truncate">{config.businessName}</p>
              {config.tagline && (
                <p className="sf-brand-tagline truncate hidden sm:block">{config.tagline}</p>
              )}
            </div>
          </Link>

          <nav className="sf-nav" aria-label="Store navigation">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sf-nav-link ${pathname === item.href ? "sf-nav-link-active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="sf-header-actions">
            <Link
              href={`${base}/products`}
              className="sf-icon-btn hidden sm:inline-flex"
              aria-label="Search jewellery"
            >
              <Search size={18} />
            </Link>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="sf-icon-btn hidden md:inline-flex"
                aria-label="WhatsApp"
              >
                <MessageCircle size={18} />
              </a>
            )}
            <Link href={`${base}/cart`} className="sf-icon-btn" aria-label="Shopping cart">
              <ShoppingBag size={18} />
              {itemCount > 0 && <span className="sf-cart-badge">{itemCount}</span>}
            </Link>
            <button
              type="button"
              className="sf-icon-btn md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <span className="text-xs font-semibold tracking-wide">Menu</span>
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <div className="sf-mobile-overlay" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="sf-mobile-drawer" role="dialog" aria-label="Navigation menu">
            <div className="flex items-center justify-between mb-4">
              <span className="sf-brand-name">{config.businessName}</span>
              <button type="button" className="sf-icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="sf-mobile-link">
                {item.label}
              </Link>
            ))}
            {config.contactPhone && (
              <a href={`tel:${config.contactPhone}`} className="sf-mobile-link flex items-center gap-2">
                <Phone size={16} />
                {config.contactPhone}
              </a>
            )}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="sf-btn sf-btn-gold sf-btn-block mt-4"
              >
                <MessageCircle size={16} />
                Chat on WhatsApp
              </a>
            )}
          </div>
        </>
      )}
    </>
  );
}
