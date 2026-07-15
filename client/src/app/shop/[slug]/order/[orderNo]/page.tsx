"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchStorefrontOrder, formatStorePrice } from "@/lib/api/storefront";
import { useStorefrontConfig } from "../../(components)/StorefrontConfigProvider";
import type { WebOrder } from "@/lib/storefront/types";

export default function OrderConfirmationPage() {
  const { slug, orderNo } = useParams<{ slug: string; orderNo: string }>();
  const config = useStorefrontConfig();
  const [order, setOrder] = useState<WebOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStorefrontOrder(slug, orderNo)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [slug, orderNo]);

  if (loading) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-zinc-500">Loading order...</div>;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-zinc-500">Order not found.</p>
        <Link href={`/shop/${slug}`} className="mt-4 inline-block underline text-sm">Back to store</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 text-center">
      <div
        className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white"
        style={{ backgroundColor: config.primaryColor }}
      >
        ✓
      </div>
      <h1 className="text-3xl font-light" style={{ color: config.accentColor }}>
        Thank You!
      </h1>
      <p className="mt-2 text-zinc-600">
        Your order <strong>{order.orderNo}</strong> has been placed successfully.
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        We will contact you at {order.customerMobile} to confirm payment and delivery.
      </p>

      <div className="mt-10 rounded-lg border bg-white p-6 text-left text-sm">
        <h2 className="mb-4 font-semibold">Order Details</h2>
        <ul className="space-y-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>{item.productName} × {item.quantity}</span>
              <span>{formatStorePrice(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t pt-4 font-semibold">
          <span>Total</span>
          <span style={{ color: config.primaryColor }}>{formatStorePrice(order.totalAmount)}</span>
        </div>
        <p className="mt-4 text-zinc-500">
          Deliver to: {order.addressLine1}, {order.city}, {order.state} {order.pincode}
        </p>
      </div>

      <Link
        href={`/shop/${slug}/products`}
        className="mt-8 inline-block rounded px-6 py-3 text-sm font-semibold text-white"
        style={{ backgroundColor: config.primaryColor }}
      >
        Continue Shopping
      </Link>
    </div>
  );
}
