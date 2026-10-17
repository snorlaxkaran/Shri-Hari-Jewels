"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { fetchWebOrders } from "@/lib/api/storefront-admin";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { WebOrder } from "@/lib/storefront/types";

const statusPill = (value: string) => {
  const base = "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium";
  if (value === "Paid") return `${base} bg-emerald-50 text-emerald-800`;
  if (value === "Unpaid") return `${base} bg-amber-50 text-amber-800`;
  if (value === "Cancelled") return `${base} bg-red-50 text-red-700`;
  return `${base} bg-zinc-100 text-zinc-700`;
};

export default function StorefrontOrdersPage() {
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWebOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader title="Orders" subtitle="All orders placed through your online store" />
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <Link href="/online-orders" className="text-zinc-500 hover:underline">
          ← Online orders dashboard
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-center text-zinc-500 py-12">No web orders yet.</p>
      ) : (
        <div className="surface-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Placed</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/storefront/orders/${order.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {order.orderNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    <div>{order.customerName}</div>
                    <div className="text-xs text-zinc-400">{order.customerMobile}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusPill(order.status)}>{order.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusPill(order.paymentStatus)}>{order.paymentStatus}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(order.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
