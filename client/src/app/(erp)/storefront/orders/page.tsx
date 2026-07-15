"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { fetchWebOrders, updateWebOrder } from "@/lib/api/storefront-admin";
import { formatCurrency, formatDate } from "@/lib/format";
import type { WebOrder } from "@/lib/storefront/types";

const STATUSES = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"] as const;
const PAYMENT_STATUSES = ["Unpaid", "Paid", "Refunded"] as const;

export default function StorefrontOrdersPage() {
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchWebOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (order: WebOrder, status: string) => {
    await updateWebOrder(order.id, { status });
    load();
  };

  const handlePaymentChange = async (order: WebOrder, paymentStatus: string) => {
    await updateWebOrder(order.id, { paymentStatus });
    load();
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader title="Web Orders" subtitle="Orders placed through your online store" />
      <div className="mb-4"><Link href="/storefront" className="text-sm text-zinc-500 hover:underline">← Back to Online Store</Link></div>

      {orders.length === 0 ? (
        <p className="text-center text-zinc-500 py-12">No web orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{order.orderNo}</p>
                  <p className="text-sm text-zinc-600">{order.customerName} · {order.customerMobile}</p>
                  <p className="text-xs text-zinc-400 mt-1">{formatDate(order.createdAt)}</p>
                </div>
                <p className="text-lg font-semibold">{formatCurrency(order.totalAmount)}</p>
              </div>

              <ul className="mt-3 text-sm text-zinc-600 space-y-1">
                {order.items.map((item) => (
                  <li key={item.id}>{item.productName} × {item.quantity} — {formatCurrency(item.lineTotal)}</li>
                ))}
              </ul>

              <p className="mt-2 text-xs text-zinc-500">
                Ship to: {order.addressLine1}, {order.city}, {order.state} {order.pincode}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(order, e.target.value)}
                  className="rounded border px-2 py-1 text-xs"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={order.paymentStatus}
                  onChange={(e) => handlePaymentChange(order, e.target.value)}
                  className="rounded border px-2 py-1 text-xs"
                >
                  {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
