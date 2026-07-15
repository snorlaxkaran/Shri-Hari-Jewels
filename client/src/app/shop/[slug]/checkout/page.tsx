"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatStorePrice, placeStorefrontOrder } from "@/lib/api/storefront";
import { getApiErrorMessage } from "@/lib/api/client";
import { useStorefrontCart } from "@/lib/storefront/cart-context";
import { useStorefrontConfig } from "../(components)/StorefrontConfigProvider";

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const config = useStorefrontConfig();
  const { items, subtotal, clearCart } = useStorefrontCart();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-zinc-500">Your cart is empty.</p>
        <Link href={`/shop/${slug}/products`} className="mt-4 inline-block underline text-sm">
          Continue shopping
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const order = await placeStorefrontOrder(slug, {
        customerName: name,
        customerEmail: email || undefined,
        customerMobile: mobile,
        addressLine1,
        addressLine2: addressLine2 || undefined,
        city,
        state,
        pincode,
        notes: notes || undefined,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      clearCart();
      router.push(`/shop/${slug}/order/${order.orderNo}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to place order."));
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = "w-full rounded border border-zinc-200 px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-light" style={{ color: config.accentColor }}>
        Checkout
      </h1>

      <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Delivery Details
          </h2>
          <input required className={fieldClass} placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={fieldClass} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input required className={fieldClass} placeholder="Mobile (10 digits) *" value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={10} />
          <input required className={fieldClass} placeholder="Address line 1 *" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
          <input className={fieldClass} placeholder="Address line 2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-3">
            <input required className={fieldClass} placeholder="City *" value={city} onChange={(e) => setCity(e.target.value)} />
            <input required className={fieldClass} placeholder="State *" value={state} onChange={(e) => setState(e.target.value)} />
            <input required className={fieldClass} placeholder="Pincode *" value={pincode} onChange={(e) => setPincode(e.target.value)} />
          </div>
          <textarea className={fieldClass} placeholder="Order notes (optional)" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />

          {error && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Order Summary
            </h2>
            <ul className="space-y-3 text-sm">
              {items.map((item) => (
                <li key={item.productId} className="flex justify-between">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{formatStorePrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t pt-4 font-semibold">
              <span>Total</span>
              <span style={{ color: config.primaryColor }}>{formatStorePrice(subtotal)}</span>
            </div>
            {config.shippingNote && (
              <p className="mt-4 text-xs text-zinc-500">{config.shippingNote}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded py-3 text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-60"
              style={{ backgroundColor: config.primaryColor }}
            >
              {submitting ? "Placing Order..." : "Place Order"}
            </button>
            <p className="mt-3 text-center text-xs text-zinc-400">
              Payment on delivery / bank transfer as arranged with the store.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
