"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { fetchWebOrder, updateWebOrder } from "@/lib/api/storefront-admin";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { WebOrder, WebOrderEvent } from "@/lib/storefront/types";

const STATUSES = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"] as const;
const PAYMENT_STATUSES = ["Unpaid", "Paid", "Refunded"] as const;

function OrderTimeline({ events }: { events: WebOrderEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-zinc-500">No activity logged yet.</p>;
  }

  return (
    <ol className="border-l border-zinc-200 ml-2 space-y-6">
      {events.map((event) => (
        <li key={event.id} className="relative ml-5">
          <span
            className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-zinc-400 ring-4 ring-white"
            aria-hidden
          />
          <p className="text-sm font-medium text-zinc-800">{event.message}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{formatDateTime(event.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}

export default function WebOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<WebOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchWebOrder(id)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const patchOrder = async (patch: { status?: string; paymentStatus?: string }) => {
    if (!order) return;
    setSaving(true);
    try {
      const updated = await updateWebOrder(order.id, patch);
      setOrder(updated);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (!order) {
    return (
      <div className="page-content">
        <p className="text-zinc-500">Order not found.</p>
        <Link href="/storefront/orders" className="text-sm text-blue-600 hover:underline mt-4 inline-block">
          Back to orders
        </Link>
      </div>
    );
  }

  const events = order.events ?? [];

  return (
    <div className="page-content">
      <PageHeader title={order.orderNo} subtitle="Online store order" />
      <div className="mb-4">
        <Link href="/storefront/orders" className="text-sm text-zinc-500 hover:underline">
          ← All orders
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="surface-card p-5">
            <h2 className="text-sm font-medium text-zinc-500 mb-3">Customer</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Name</dt>
                <dd className="font-medium">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Mobile</dt>
                <dd className="font-medium">{order.customerMobile}</dd>
              </div>
              {order.customerEmail && (
                <div className="sm:col-span-2">
                  <dt className="text-zinc-500">Email</dt>
                  <dd>{order.customerEmail}</dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">Shipping address</dt>
                <dd>
                  {order.addressLine1}
                  {order.addressLine2 ? `, ${order.addressLine2}` : ""}
                  <br />
                  {order.city}, {order.state} {order.pincode}
                  <br />
                  {order.country}
                </dd>
              </div>
              {order.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-zinc-500">Notes</dt>
                  <dd>{order.notes}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-medium text-zinc-500 mb-3">Line items</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-200">
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Qty</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-100">
                    <td className="py-2 font-mono text-xs">{item.productSku}</td>
                    <td className="py-2">{item.productName}</td>
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-3 text-right font-medium text-zinc-600">
                    Total
                  </td>
                  <td className="pt-3 text-right font-semibold text-lg">
                    {formatCurrency(order.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-medium text-zinc-500 mb-4">Activity log</h2>
            <OrderTimeline events={events} />
          </section>
        </div>

        <aside className="space-y-4">
          <div className="surface-card p-5">
            <h2 className="text-sm font-medium text-zinc-500 mb-3">Order</h2>
            <p className="text-xs text-zinc-500">Placed {formatDateTime(order.createdAt)}</p>
            <p className="text-xs text-zinc-500 mt-1">Updated {formatDateTime(order.updatedAt)}</p>

            <div className="mt-4 space-y-3">
              <label className="block text-xs text-zinc-500">
                Fulfilment status
                <select
                  disabled={saving}
                  value={order.status}
                  onChange={(e) => void patchOrder({ status: e.target.value })}
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-zinc-500">
                Payment
                <select
                  disabled={saving}
                  value={order.paymentStatus}
                  onChange={(e) => void patchOrder({ paymentStatus: e.target.value })}
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
