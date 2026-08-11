"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  createBillingOrder,
  loadRazorpayScript,
  updateOrganizationModules,
  verifyBillingPayment,
} from "@/lib/api/modules";
import { getApiErrorMessage } from "@/lib/api/client";
import { clearSubscriptionLockout } from "@/lib/subscription-lockout";
import {
  JEWELLERY_MODULES,
  MODULE_META,
  MODULE_PRICING,
  type JewelleryModuleId,
} from "@/lib/onboarding/config";
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
  const [selectedModules, setSelectedModules] = useState<JewelleryModuleId[]>([]);
  const [savingModules, setSavingModules] = useState(false);
  const [paying, setPaying] = useState(false);
  const [moduleMessage, setModuleMessage] = useState("");

  const load = useCallback(() => {
    return Promise.all([fetchBillingInfo(), fetchPlatformContact()])
      .then(([billingData, contactData]) => {
        setBilling(billingData);
        setContact(contactData);
        const modules = (billingData.subscription.enabledModules ?? ["inventory", "sales"]) as JewelleryModuleId[];
        setSelectedModules(modules);
      })
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load billing information.")));
  }, []);

  useEffect(() => {
    clearSubscriptionLockout();
    load().finally(() => setLoading(false));
  }, [load]);

  const computedAmount = selectedModules.reduce((sum, id) => sum + MODULE_PRICING[id], 0);

  const toggleModule = (id: JewelleryModuleId) => {
    if (id === "inventory") return;
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const saveModules = async () => {
    setSavingModules(true);
    setModuleMessage("");
    try {
      const result = await updateOrganizationModules(selectedModules);
      setModuleMessage("Modules updated. Your monthly amount has been recalculated.");
      await load();
      setSelectedModules(result.enabledModules);
    } catch (err) {
      setModuleMessage(getApiErrorMessage(err, "Failed to update modules."));
    } finally {
      setSavingModules(false);
    }
  };

  const startRazorpayCheckout = async () => {
    if (!billing?.razorpayEnabled) return;
    setPaying(true);
    setError("");
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Could not load payment gateway.");
      }

      const order = await createBillingOrder();
      if (!order.keyId) {
        throw new Error("Payment gateway is not configured.");
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Shree Hari Jewels ERP",
        description: "Monthly subscription",
        order_id: order.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyBillingPayment(response);
            clearSubscriptionLockout();
            await load();
          } catch (err) {
            setError(getApiErrorMessage(err, "Payment verification failed."));
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });
      rzp.open();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not start checkout."));
      setPaying(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (error && !billing) {
    return (
      <div>
        <PageHeader title="Billing" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!billing) {
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
  const needsPayment =
    isSuspended || subscription.status === "Trialing" || subscription.status === "Past Due";
  const modulesChanged =
    JSON.stringify([...selectedModules].sort()) !==
    JSON.stringify([...(subscription.enabledModules ?? [])].sort());

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Billing & subscription"
        subtitle="Manage modules, pricing, and renew your ERP plan"
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {isSuspended && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Your account is currently locked. Complete payment to restore access to the ERP.
          {subscription.gracePeriodDays > 0 && (
            <span className="block mt-1 text-red-700/80">
              A {subscription.gracePeriodDays}-day grace period applies after your trial or billing period ends.
            </span>
          )}
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
          {subscription.gracePeriodDays > 0 && (
            <div>
              <dt className="text-[var(--text-muted)]">Grace period</dt>
              <dd className="font-medium mt-0.5">{subscription.gracePeriodDays} days after period end</dd>
            </div>
          )}
        </dl>
      </section>

      <section
        className="rounded-xl border p-6 space-y-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <h2 className="font-medium">Your modules</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Select the ERP modules your business uses. Pricing is per module; changes update your monthly amount immediately.
        </p>

        <ul className="space-y-2">
          {JEWELLERY_MODULES.map((id) => {
            const checked = selectedModules.includes(id);
            const locked = id === "inventory";
            return (
              <li
                key={id}
                className="flex items-start gap-3 rounded-lg border px-4 py-3"
                style={{ borderColor: "var(--border)" }}
              >
                <input
                  type="checkbox"
                  id={`module-${id}`}
                  checked={checked}
                  disabled={locked}
                  onChange={() => toggleModule(id)}
                  className="mt-1"
                />
                <label htmlFor={`module-${id}`} className="flex-1 cursor-pointer">
                  <span className="font-medium text-sm">{MODULE_META[id].label}</span>
                  <span className="block text-xs text-[var(--text-muted)] mt-0.5">
                    {MODULE_META[id].description}
                  </span>
                </label>
                <span className="text-sm font-medium whitespace-nowrap">
                  {formatCurrency(MODULE_PRICING[id])}/mo
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm">
            Total: <strong>{formatCurrency(computedAmount)}</strong> / month
          </p>
          {modulesChanged && (
            <button
              type="button"
              onClick={saveModules}
              disabled={savingModules}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
            >
              {savingModules ? "Saving…" : "Save module selection"}
            </button>
          )}
        </div>
        {moduleMessage && (
          <p className="text-sm text-[var(--text-muted)]">{moduleMessage}</p>
        )}
      </section>

      <section
        className="rounded-xl border p-6"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <h2 className="font-medium mb-2">Renew your subscription</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Pay {formatCurrency(computedAmount)} for one month of access to your selected modules.
        </p>

        <div
          className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm mb-4"
          style={{ borderColor: "var(--border)", background: "var(--bg-page)" }}
        >
          <ShieldCheck size={18} className="mt-0.5 text-emerald-600 flex-shrink-0" />
          <p>Your data is safe and will remain available once payment is confirmed.</p>
        </div>

        {billing.razorpayEnabled ? (
          <button
            type="button"
            onClick={startRazorpayCheckout}
            disabled={paying || modulesChanged}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
          >
            <CreditCard size={16} />
            {paying ? "Opening checkout…" : `Pay ${formatCurrency(computedAmount)} with Razorpay`}
          </button>
        ) : null}

        {modulesChanged && billing.razorpayEnabled && (
          <p className="text-xs text-amber-700 mt-2">Save your module selection before paying.</p>
        )}

        {!billing.razorpayEnabled && needsPayment && (
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Online payment is not configured. Contact us to renew via bank transfer or other agreed method.
          </p>
        )}

        {(contact?.phone || contact?.email || contact?.whatsapp) && (
          <ul className="space-y-2 text-sm mt-4">
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
