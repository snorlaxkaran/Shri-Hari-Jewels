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
      <div className="sf-empty">
        <p className="sf-empty-title">Your bag is empty</p>
        <Link href={`/shop/${slug}/products`} className="sf-view-all mt-4 inline-flex">
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

  return (
    <div className="sf-section">
      <div className="sf-shell">
        <h1 className="sf-display sf-page-title">Checkout</h1>

        <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <p className="sf-eyebrow">Delivery details</p>

            <div className="sf-form-group">
              <label htmlFor="checkout-name">Full name *</label>
              <input id="checkout-name" required className="sf-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sf-form-group">
                <label htmlFor="checkout-email">Email</label>
                <input id="checkout-email" type="email" className="sf-input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="sf-form-group">
                <label htmlFor="checkout-mobile">Mobile *</label>
                <input id="checkout-mobile" required className="sf-input" value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={10} />
              </div>
            </div>
            <div className="sf-form-group">
              <label htmlFor="checkout-addr1">Address line 1 *</label>
              <input id="checkout-addr1" required className="sf-input" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
            </div>
            <div className="sf-form-group">
              <label htmlFor="checkout-addr2">Address line 2</label>
              <input id="checkout-addr2" className="sf-input" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sf-form-group">
                <label htmlFor="checkout-city">City *</label>
                <input id="checkout-city" required className="sf-input" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="sf-form-group">
                <label htmlFor="checkout-state">State *</label>
                <input id="checkout-state" required className="sf-input" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div className="sf-form-group">
                <label htmlFor="checkout-pin">Pincode *</label>
                <input id="checkout-pin" required className="sf-input" value={pincode} onChange={(e) => setPincode(e.target.value)} />
              </div>
            </div>
            <div className="sf-form-group">
              <label htmlFor="checkout-notes">Order notes</label>
              <textarea id="checkout-notes" className="sf-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gift wrap, delivery instructions…" />
            </div>

            {error && <div className="sf-alert-error">{error}</div>}
          </div>

          <div className="lg:col-span-2">
            <div className="sf-summary-card sticky top-24">
              <p className="sf-eyebrow mb-4">Order summary</p>
              <ul className="space-y-3 text-sm">
                {items.map((item) => (
                  <li key={item.productId} className="flex justify-between gap-2">
                    <span className="text-[var(--sf-muted)]">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-medium shrink-0">{formatStorePrice(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t border-[var(--sf-border)] pt-4 font-semibold text-lg">
                <span>Total</span>
                <span>{formatStorePrice(subtotal)}</span>
              </div>
              {config.shippingNote && (
                <p className="mt-4 text-xs text-[var(--sf-muted)]">{config.shippingNote}</p>
              )}
              <button type="submit" disabled={submitting} className="sf-btn sf-btn-primary sf-btn-block mt-6">
                {submitting ? "Placing order…" : "Place order"}
              </button>
              <p className="mt-3 text-center text-xs text-[var(--sf-muted)]">
                Payment on delivery or bank transfer as arranged with the store.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
