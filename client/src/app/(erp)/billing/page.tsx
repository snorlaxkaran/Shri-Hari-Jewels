"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import {
  fetchBillingInfo,
  fetchPlatformContact,
  type BillingInfo,
  type PlatformContactInfo,
} from "@/lib/api/billing";
import { getApiErrorMessage } from "@/lib/api/client";
import { clearSubscriptionLockout } from "@/lib/subscription-lockout";
import { formatCurrency, formatDate } from "@/lib/format";

const statusLabel: Record<string, string> = {
  Trialing: "Trial",
  Active: "Active",
  "Past Due": "Past due",
  Suspended: "Suspended",
  Cancelled: "Cancelled",
};

const statusColor: Record<string, string> = {
  Trialing: "text-blue-700 bg-blue-50 border-blue-200",
  Active: "text-emerald-700 bg-emerald-50 border-emerald-200",
  "Past Due": "text-amber-700 bg-amber-50 border-amber-200",
  Suspended: "text-red-700 bg-red-50 border-red-200",
  Cancelled: "text-zinc-600 bg-zinc-50 border-zinc-200",
};

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [contact, setContact] = useState<PlatformContactInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    clearSubscriptionLockout();
    Promise.all([fetchBillingInfo(), fetchPlatformContact()])
      .then(([billingData, contactData]) => {
        setBilling(billingData);
        setContact(contactData);
      })
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load billing information.")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  if (error || !billing) {
    return (
      <div>
        <PageHeader title="Billing" />
        <p className="text-sm text-red-600">{error || "Billing information unavailable."}</p>
      </div>
    );
  }

  const { subscription, payments } = billing;
  const monthlyAmount = Number(subscription.monthlyAmount);
  const isSuspended = subscription.status === "Suspended" || subscription.status === "Cancelled";

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Billing & subscription"
        subtitle="Your ERP subscription plan and payment history"
      />

      {isSuspended && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Your account is currently locked. Complete payment to restore access to the ERP.
        </div>
      )}

      <section
        className="rounded-xl border p-6 space-y-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Current plan</p>
            <p className="text-xl font-semibold mt-1">{subscription.planName}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {formatCurrency(monthlyAmount)} / month
            </p>
          </div>
          <span
            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
              statusColor[subscription.status] ?? statusColor.Cancelled
            }`}
          >
            {statusLabel[subscription.status] ?? subscription.status}
          </span>
        </div>

        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-[var(--text-muted)]">Current period ends</dt>
            <dd className="font-medium mt-0.5">{formatDate(subscription.currentPeriodEnd)}</dd>
          </div>
          {subscription.status === "Trialing" && (
            <div>
              <dt className="text-[var(--text-muted)]">Trial ends</dt>
              <dd className="font-medium mt-0.5">{formatDate(subscription.trialEndsAt)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section
        className="rounded-xl border p-6"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <h2 className="font-medium mb-2">Renew your subscription</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Subscription payments are handled by our team. Contact us to renew via bank transfer,
          cheque, or other agreed payment method.
        </p>

        <div className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm mb-4"
          style={{ borderColor: "var(--border)", background: "var(--bg-page)" }}
        >
          <ShieldCheck size={18} className="mt-0.5 text-emerald-600 flex-shrink-0" />
          <p>Your data is safe and will remain available once payment is confirmed.</p>
        </div>

        {(contact?.phone || contact?.email || contact?.whatsapp) ? (
          <ul className="space-y-2 text-sm">
            {contact.phone && (
              <li>
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-blue-600 hover:underline">
                  <Phone size={14} />
                  {contact.phone}
                </a>
              </li>
            )}
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 text-blue-600 hover:underline">
                  <Mail size={14} />
                  {contact.email}
                </a>
              </li>
            )}
            {contact.whatsapp && (
              <li>
                <a
                  href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <MessageCircle size={14} />
                  WhatsApp: {contact.whatsapp}
                </a>
              </li>
            )}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Contact your account manager to renew. Platform contact details are not configured yet.
          </p>
        )}
      </section>

      <section
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-medium flex items-center gap-2">
            <CreditCard size={18} />
            Payment history
          </h2>
        </div>
        {payments.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {payments.map((payment) => (
              <li key={payment.id} className="px-6 py-4 flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{formatCurrency(Number(payment.amount))}</p>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">
                    {payment.method} · {payment.periodCovered}
                  </p>
                </div>
                <div className="text-right text-xs text-[var(--text-muted)]">
                  <p>{formatDate(payment.createdAt)}</p>
                  <p>Recorded by {payment.recordedByName}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isSuspended && (
        <p className="text-xs text-[var(--text-muted)]">
          Need help?{" "}
          <Link href="/settings" className="text-blue-600 hover:underline">
            Go to settings
          </Link>
        </p>
      )}
    </div>
  );
}
