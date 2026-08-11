"use client";

import { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(async () => {
    const [storeSettings, products] = await Promise.all([
      fetchStorefrontAdminSettings().catch(() => null),
      fetchPublishableProducts().catch(() => []),
    ]);
    setSettings(storeSettings);
    setPublishedIds(
      new Set(products.filter((product) => product.publishedToStorefront).map((product) => product.id)),
    );
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const getStoreHref = (productId: string) =>
    settings?.slug && publishedIds.has(productId)
      ? storefrontProductPath(settings.slug, productId)
      : null;

  const isPublished = (productId: string) => publishedIds.has(productId);

  const setPublished = useCallback((productId: string, published: boolean) => {
    setPublishedIds((prev) => {
      const next = new Set(prev);
      if (published) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);

  return { settings, loading, getStoreHref, isPublished, setPublished, refresh: load };
}
