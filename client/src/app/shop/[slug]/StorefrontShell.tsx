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
        <StorefrontHeader slug={slug} config={config} />
        <main className="flex-1">{children}</main>
        <StorefrontFooter slug={slug} config={config} />
      </StorefrontCartProvider>
    </StorefrontConfigProvider>
  );
}
