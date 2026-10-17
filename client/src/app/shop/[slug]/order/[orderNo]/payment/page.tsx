"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import {
  fetchStorefrontOrder,
  formatStorePrice,
  simulateStorefrontPayment,
} from "@/lib/api/storefront";
import { getApiErrorMessage } from "@/lib/api/client";
import type { WebOrder } from "@/lib/storefront/types";

type PayPhase = "ready" | "paying" | "success" | "error";

export default function OrderPaymentPage() {
  const { slug, orderNo } = useParams<{ slug: string; orderNo: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<WebOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<PayPhase>("ready");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStorefrontOrder(slug, orderNo)
      .then((o) => {
        setOrder(o);
        if (o.paymentStatus === "Paid") {
          setPhase("success");
        }
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [slug, orderNo]);

  const handlePay = async () => {
    if (!order || phase === "paying") return;
    setError("");
    setPhase("paying");
    try {
      await new Promise((r) => setTimeout(r, 1800));
      const updated = await simulateStorefrontPayment(slug, orderNo);
      setOrder(updated);
      setPhase("success");
    } catch (err) {
      setError(getApiErrorMessage(err, "Payment could not be completed."));
      setPhase("error");
    }
  };

  if (loading) {
    return (
      <div className="sf-empty">
        <p className="sf-empty-desc">Loading payment…</p>
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

  if (phase === "success") {
    return (
      <div className="sf-section">
        <div className="sf-shell max-w-lg mx-auto text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg">
            <Check size={40} strokeWidth={2.5} />
          </div>
          <h1 className="sf-display text-3xl">Payment successful</h1>
          <p className="mt-2 text-[var(--sf-muted)]">
            {formatStorePrice(order.totalAmount)} received for order{" "}
            <strong className="text-[var(--sf-dark)]">{order.orderNo}</strong>.
          </p>
          <p className="mt-1 text-sm text-[var(--sf-muted)]">
            This is a demo payment — no real money was charged.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/shop/${slug}/order/${orderNo}`)}
            className="sf-btn sf-btn-primary mt-8"
          >
            View order confirmation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sf-section">
      <div className="sf-shell max-w-lg mx-auto">
        <p className="sf-eyebrow">Secure checkout</p>
        <h1 className="sf-display sf-page-title">Complete payment</h1>
        <p className="text-sm text-[var(--sf-muted)] mb-8">
          Order <strong>{order.orderNo}</strong>
        </p>

        <div className="sf-summary-card">
          <p className="text-sm text-[var(--sf-muted)] mb-1">Amount to pay</p>
          <p className="text-3xl font-semibold tracking-tight">
            {formatStorePrice(order.totalAmount)}
          </p>

          <ul className="mt-6 space-y-2 text-sm border-t border-[var(--sf-border)] pt-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2 text-[var(--sf-muted)]">
                <span>{item.productSku} × {item.quantity}</span>
                <span>{formatStorePrice(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          {phase === "paying" ? (
            <div className="mt-8 flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-10 w-10 animate-spin text-[var(--sf-gold)]" />
              <p className="text-sm text-[var(--sf-muted)]">Processing payment…</p>
            </div>
          ) : (
            <>
              {error && <div className="sf-alert-error mt-4">{error}</div>}
              <button
                type="button"
                onClick={() => void handlePay()}
                className="sf-btn sf-btn-primary sf-btn-block mt-8"
              >
                Pay {formatStorePrice(order.totalAmount)}
              </button>
              <p className="mt-3 text-center text-xs text-[var(--sf-muted)]">
                Demo mode — tap Pay to simulate a successful transaction.
              </p>
            </>
          )}
        </div>

        <Link
          href={`/shop/${slug}/order/${orderNo}`}
          className="block text-center text-sm text-[var(--sf-muted)] mt-6 hover:underline"
        >
          Skip for now (pay later)
        </Link>
      </div>
    </div>
  );
}
