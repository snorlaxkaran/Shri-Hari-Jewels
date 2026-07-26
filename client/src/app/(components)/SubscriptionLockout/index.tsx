"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import {
  fetchPlatformContact,
  type PlatformContactInfo,
} from "@/lib/api/billing";
import {
  getSubscriptionLockout,
  SUBSCRIPTION_LOCKOUT_EVENT,
  type SubscriptionExpiredPayload,
} from "@/lib/subscription-lockout";
import { formatDate } from "@/lib/format";

type SubscriptionLockoutProps = {
  payload: SubscriptionExpiredPayload;
  contact: PlatformContactInfo | null;
};

function LockoutContent({ payload, contact }: SubscriptionLockoutProps) {
  const wasActive = payload.status === "Active" || payload.status === "Past Due";
  const heading = wasActive
    ? "Your subscription payment is due"
    : "Your trial period has ended";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: "var(--bg-page)" }}
    >
      <div
        className="max-w-lg w-full rounded-2xl border p-8 text-center shadow-lg"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "rgb(37 99 235 / 0.12)", color: "#2563eb" }}
        >
          <CreditCard size={28} strokeWidth={1.5} />
        </div>

        <h1 className="font-display text-2xl font-semibold mb-2">{heading}</h1>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {payload.message}
        </p>

        <div
          className="rounded-lg border px-4 py-3 text-sm mb-6 text-left space-y-1"
          style={{ borderColor: "var(--border)", background: "var(--bg-page)" }}
        >
          <p className="flex items-start gap-2">
            <ShieldCheck size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
            <span>
              Your data is safe and will be available as soon as payment is completed.
            </span>
          </p>
          {payload.currentPeriodEnd && (
            <p className="text-[var(--text-muted)] pl-6">
              Access ended on {formatDate(payload.currentPeriodEnd)}
            </p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <Link
            href="/billing"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
          >
            <CreditCard size={16} />
            View billing & renewal options
          </Link>
        </div>

        {(contact?.phone || contact?.email || contact?.whatsapp) && (
          <div className="border-t pt-5 space-y-2" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
              Contact us to renew
            </p>
            {contact.phone && (
              <a
                href={`tel:${contact.phone.replace(/\s/g, "")}`}
                className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Phone size={14} />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Mail size={14} />
                {contact.email}
              </a>
            )}
            {contact.whatsapp && (
              <a
                href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <MessageCircle size={14} />
                WhatsApp: {contact.whatsapp}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionLockout() {
  const [payload, setPayload] = useState<SubscriptionExpiredPayload | null>(null);
  const [contact, setContact] = useState<PlatformContactInfo | null>(null);

  useEffect(() => {
    setPayload(getSubscriptionLockout());

    const onLockout = (event: Event) => {
      const detail = (event as CustomEvent<SubscriptionExpiredPayload | null>).detail;
      setPayload(detail ?? getSubscriptionLockout());
    };

    window.addEventListener(SUBSCRIPTION_LOCKOUT_EVENT, onLockout);
    return () => window.removeEventListener(SUBSCRIPTION_LOCKOUT_EVENT, onLockout);
  }, []);

  useEffect(() => {
    if (!payload) return;
    fetchPlatformContact()
      .then(setContact)
      .catch(() => setContact(null));
  }, [payload]);

  if (!payload) return null;

  return <LockoutContent payload={payload} contact={contact} />;
}
