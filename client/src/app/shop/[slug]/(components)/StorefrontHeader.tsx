"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { useStorefrontCart } from "@/lib/storefront/cart-context";
import type { StorefrontConfig } from "@/lib/storefront/types";

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

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: `${config.primaryColor}22`,
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href={base} className="flex items-center gap-3">
          {config.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logoUrl} alt={config.businessName} className="h-10 w-auto" />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: config.primaryColor }}
            >
              {config.businessName.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-base font-semibold tracking-wide" style={{ color: config.accentColor }}>
              {config.businessName}
            </p>
            {config.tagline && (
              <p className="text-xs text-zinc-500">{config.tagline}</p>
            )}
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium transition-colors hover:opacity-70"
              style={{
                color: pathname === item.href ? config.primaryColor : config.accentColor,
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={`${base}/cart`}
            className="relative rounded-full p-2 transition-colors hover:bg-zinc-100"
            aria-label="Cart"
          >
            <ShoppingBag size={20} style={{ color: config.accentColor }} />
            {itemCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: config.primaryColor }}
              >
                {itemCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="rounded p-2 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t px-4 py-3 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block py-2 text-sm font-medium"
              onClick={() => setMenuOpen(false)}
              style={{ color: config.accentColor }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
