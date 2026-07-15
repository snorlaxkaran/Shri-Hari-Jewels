"use client";

import { StorefrontCartProvider } from "@/lib/storefront/cart-context";
import type { StorefrontConfig } from "@/lib/storefront/types";
import StorefrontConfigProvider from "./(components)/StorefrontConfigProvider";
import StorefrontFooter from "./(components)/StorefrontFooter";
import StorefrontHeader from "./(components)/StorefrontHeader";

export default function StorefrontShell({
  slug,
  config,
  children,
}: {
  slug: string;
  config: StorefrontConfig;
  children: React.ReactNode;
}) {
  return (
    <StorefrontConfigProvider config={config}>
      <StorefrontCartProvider slug={slug}>
        <div className="flex min-h-screen flex-col bg-[#faf9f7] font-[family-name:var(--font-inter)]">
          <StorefrontHeader slug={slug} config={config} />
          <main className="flex-1">{children}</main>
          <StorefrontFooter slug={slug} config={config} />
        </div>
      </StorefrontCartProvider>
    </StorefrontConfigProvider>
  );
}
