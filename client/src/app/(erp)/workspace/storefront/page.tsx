"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Globe, Layers, Package, ShoppingBag } from "lucide-react";
import ModuleOnboarding from "@/app/(components)/ModuleOnboarding";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import WorkspaceHome from "@/app/(components)/WorkspaceHome";
import {
  fetchStorefrontAdminSettings,
  fetchStorefrontStats,
} from "@/lib/api/storefront-admin";

export default function StorefrontWorkspacePage() {
  const [loading, setLoading] = useState(true);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({
    published: "0",
    pending: "0",
    collections: "0",
  });

  useEffect(() => {
    Promise.all([fetchStorefrontAdminSettings(), fetchStorefrontStats()])
      .then(([settings, st]) => {
        setStoreUrl(settings.enabled ? settings.storeUrl : null);
        setStats({
          published: String(st?.publishedProducts ?? 0),
          pending: String(st?.pendingOrders ?? 0),
          collections: String(st?.collections ?? 0),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <>
      <ModuleOnboarding moduleId="storefront" />
      <WorkspaceHome
        title="Online Store"
        subtitle="Branded website synced to the same stock as your counter"
        stats={[
          { label: "Published products", value: stats.published },
          { label: "Pending web orders", value: stats.pending },
          { label: "Collections", value: stats.collections },
        ]}
        action={
          storeUrl ? (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"
            >
              <ExternalLink size={16} />
              View store
            </a>
          ) : (
            <Link href="/storefront/settings" className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
              <Globe size={16} />
              Enable store
            </Link>
          )
        }
        shortcuts={[
          { href: "/storefront/settings", label: "Store settings", description: "Theme & enable", icon: Globe },
          { href: "/storefront/products", label: "Publish products", description: "Pick counter stock", icon: Package },
          { href: "/storefront/collections", label: "Collections", description: "Curated groups", icon: Layers },
          { href: "/storefront/orders", label: "Web orders", description: "Online checkout", icon: ShoppingBag },
        ]}
      />
    </>
  );
}
