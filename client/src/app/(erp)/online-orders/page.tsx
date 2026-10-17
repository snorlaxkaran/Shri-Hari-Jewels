"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { fetchStorefrontStats, fetchWebOrders } from "@/lib/api/storefront-admin";
import { formatCurrency } from "@/lib/format";
import type { WebOrder } from "@/lib/storefront/types";

export default function OnlineOrdersDashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchStorefrontStats>> | null>(
    null,
  );
  const [recent, setRecent] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStorefrontStats(), fetchWebOrders()])
      .then(([s, orders]) => {
        setStats(s);
        setRecent(orders.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title="Online orders"
        subtitle="Orders placed on your website — payments, fulfilment, and customer details"
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="surface-card p-5">
          <p className="text-sm text-zinc-500">Total web orders</p>
          <p className="text-2xl font-semibold mt-1">{stats?.webOrders ?? 0}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-zinc-500">Pending fulfilment</p>
          <p className="text-2xl font-semibold mt-1">{stats?.pendingOrders ?? 0}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-zinc-500">Published products</p>
          <p className="text-2xl font-semibold mt-1">{stats?.publishedProducts ?? 0}</p>
        </div>
      </div>

      <div className="surface-card p-5 mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-zinc-500" />
            <h2 className="font-medium">Orders</h2>
          </div>
          <Link
            href="/storefront/orders"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            View all orders
            <ArrowRight size={14} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="text-sm text-zinc-500 py-6 text-center">No online orders yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {recent.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/storefront/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-zinc-50/80 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{order.orderNo}</p>
                    <p className="text-xs text-zinc-500">
                      {order.customerName} · {order.status} · {order.paymentStatus}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(order.totalAmount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/workspace/storefront" className="text-sm text-zinc-500 hover:underline">
        ← Online store setup
      </Link>
    </div>
  );
}
