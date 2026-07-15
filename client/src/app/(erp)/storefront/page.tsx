"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Globe, Package, ShoppingBag, Layers } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatCard from "@/app/(components)/StatCard";
import {
  fetchStorefrontAdminSettings,
  fetchStorefrontStats,
} from "@/lib/api/storefront-admin";
import type { StorefrontAdminSettings, StorefrontStats } from "@/lib/storefront/types";

export default function StorefrontDashboardPage() {
  const [settings, setSettings] = useState<StorefrontAdminSettings | null>(null);
  const [stats, setStats] = useState<StorefrontStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStorefrontAdminSettings(), fetchStorefrontStats()])
      .then(([s, st]) => {
        setSettings(s);
        setStats(st);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title="Online Store"
        subtitle="Manage your tenant e-commerce website"
        action={
          settings?.enabled ? (
            <a
              href={settings.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <ExternalLink size={15} />
              View Store
            </a>
          ) : null
        }
      />

      {!settings?.enabled && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your online store is currently <strong>disabled</strong>. Enable it in{" "}
          <Link href="/storefront/settings" className="underline font-medium">Store Settings</Link>{" "}
          to go live.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[10px] mb-6">
        <StatCard label="Published Products" value={String(stats?.publishedProducts ?? 0)} />
        <StatCard label="Total Products" value={String(stats?.totalProducts ?? 0)} />
        <StatCard label="Collections" value={String(stats?.collections ?? 0)} />
        <StatCard label="Pending Orders" value={String(stats?.pendingOrders ?? 0)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/storefront/settings", icon: Globe, label: "Store Settings", desc: "Theme, branding, enable store" },
          { href: "/storefront/products", icon: Package, label: "Publish Products", desc: "Choose what appears online" },
          { href: "/storefront/collections", icon: Layers, label: "Collections", desc: "Curate product groups" },
          { href: "/storefront/orders", icon: ShoppingBag, label: "Web Orders", desc: "Online customer orders" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="surface-card p-5 transition-shadow hover:shadow-md block"
          >
            <item.icon size={22} className="mb-3 text-zinc-500" />
            <h3 className="font-medium">{item.label}</h3>
            <p className="mt-1 text-xs text-zinc-500">{item.desc}</p>
          </Link>
        ))}
      </div>

      {settings && (
        <div className="mt-6 surface-card p-5">
          <h3 className="text-sm font-semibold mb-2">Store URL</h3>
          <p className="text-sm text-zinc-600 font-mono">{settings.storeUrl}</p>
          {settings.customDomain && (
            <p className="mt-2 text-sm text-zinc-500">
              Custom domain: <span className="font-mono">{settings.customDomain}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
