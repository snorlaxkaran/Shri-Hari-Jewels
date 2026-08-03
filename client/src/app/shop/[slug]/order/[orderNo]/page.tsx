"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check } from "lucide-react";
import { fetchStorefrontOrder, formatStorePrice } from "@/lib/api/storefront";
import type { WebOrder } from "@/lib/storefront/types";

export default function OrderConfirmationPage() {
  const { slug, orderNo } = useParams<{ slug: string; orderNo: string }>();
  const [order, setOrder] = useState<WebOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStorefrontOrder(slug, orderNo)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [slug, orderNo]);

  if (loading) {
    return (
      <div className="sf-empty">
        <p className="sf-empty-desc">Loading your order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="sf-empty">
        <p className="sf-empty-title">Order not found</p>
        <Link href={`/shop/${slug}`} className="sf-view-all mt-4 inline-flex">
          Back to store
        </Link>
      </div>
    );
  }

  return (
    <div className="sf-section">
      <div className="sf-shell max-w-2xl mx-auto text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--sf-dark)] text-white">
          <Check size={28} strokeWidth={2} />
        </div>
        <h1 className="sf-display text-3xl">Thank you</h1>
        <p className="mt-2 text-[var(--sf-muted)]">
          Order <strong className="text-[var(--sf-dark)]">{order.orderNo}</strong> placed successfully.
        </p>
        <p className="mt-1 text-sm text-[var(--sf-muted)]">
          We&apos;ll contact you at {order.customerMobile} to confirm payment and delivery.
        </p>

        <div className="sf-summary-card mt-10 text-left">
          <h2 className="font-semibold mb-4">Order details</h2>
          <ul className="space-y-2 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span className="text-[var(--sf-muted)]">
                  {item.productName} × {item.quantity}
                </span>
                <span className="font-medium">{formatStorePrice(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-[var(--sf-border)] pt-4 font-semibold">
            <span>Total</span>
            <span>{formatStorePrice(order.totalAmount)}</span>
          </div>
          <p className="mt-4 text-sm text-[var(--sf-muted)]">
            Deliver to: {order.addressLine1}, {order.city}, {order.state} {order.pincode}
          </p>
        </div>

        <Link href={`/shop/${slug}/products`} className="sf-btn sf-btn-primary mt-8">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
