"use client";

import { useEffect, useState } from "react";
import {
  fetchPublishableProducts,
  fetchStorefrontAdminSettings,
} from "@/lib/api/storefront-admin";
import { storefrontProductPath } from "@/lib/storefront/urls";
import type { StorefrontAdminSettings } from "@/lib/storefront/types";

export function useStorefrontProductLinks() {
  const [settings, setSettings] = useState<StorefrontAdminSettings | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchStorefrontAdminSettings().catch(() => null),
      fetchPublishableProducts().catch(() => []),
    ])
      .then(([storeSettings, products]) => {
        setSettings(storeSettings);
        setPublishedIds(
          new Set(products.filter((p) => p.publishedToStorefront).map((p) => p.id)),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const getStoreHref = (productId: string) =>
    settings?.slug && publishedIds.has(productId)
      ? storefrontProductPath(settings.slug, productId)
      : null;

  const isPublished = (productId: string) => publishedIds.has(productId);

  return { settings, loading, getStoreHref, isPublished };
}
