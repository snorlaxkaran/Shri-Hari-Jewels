"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Gem,
  LogOut,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  createOrganization,
  deleteOrganization,
  extendSubscriptionTrial,
  fetchOrganizationSubscription,
  fetchOrganizations,
  reactivateSubscription,
  recordSubscriptionPayment,
  suspendSubscription,
  type CreateOrganizationInput,
  type OrganizationSubscriptionDetail,
  type OrganizationSummary,
} from "@/lib/api/organizations";
import type { SubscriptionStatus } from "@/lib/api/billing";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatCurrency, formatDate } from "@/lib/format";

const emptyForm: CreateOrganizationInput = {
  name: "",
  slug: "",
  emailDomain: "",
  adminEmail: "",
  adminName: "",
  adminPassword: "",
};

const statusStyles: Record<SubscriptionStatus, string> = {
  Trialing: "text-blue-700 bg-blue-50",
  Active: "text-emerald-700 bg-emerald-50",
  "Past Due": "text-amber-700 bg-amber-50",
  Suspended: "text-red-700 bg-red-50",
  Cancelled: "text-zinc-600 bg-zinc-100",
};

function SubscriptionBadge({ status }: { status: SubscriptionStatus | null | undefined }) {
  if (!status) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-zinc-100 text-zinc-600">
        No subscription
      </span>
    );
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

function CompanySubscriptionPanel({
  company,
  onUpdated,
}: {
  company: OrganizationSummary;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<OrganizationSubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [extendDate, setExtendDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrganizationSubscription(company.id);
      setDetail(data);
      if (data.subscription) {
        setPaymentAmount(data.subscription.monthlyAmount);
        setExtendDate(data.subscription.trialEndsAt.slice(0, 10));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load subscription."));
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    if (open && !detail) void loadDetail();
  }, [open, detail, loadDetail]);

  const runAction = async (action: () => Promise<unknown>) => {
    setSubmitting(true);
    setError("");
    try {
      await action();
      await loadDetail();
      onUpdated();
    } catch (err) {
      setError(getApiErrorMessage(err, "Action failed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs inline-flex items-center gap-1 text-blue-600 hover:underline"
      >
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Manage subscription
      </button>

      {open && (
        <div
          className="mt-3 rounded-lg border p-4 space-y-4 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg-page)" }}
        >
          {loading && !detail && (
            <p className="text-[var(--text-muted)]">Loading subscription...</p>
          )}
          {error && (
            <p className="text-red-600 text-xs">{error}</p>
          )}
          {detail?.subscription && (
            <>
              <dl className="grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-[var(--text-muted)]">Plan</dt>
                  <dd className="font-medium">{detail.subscription.planName}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Monthly amount</dt>
                  <dd className="font-medium">
                    {formatCurrency(Number(detail.subscription.monthlyAmount))}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Period ends</dt>
                  <dd className="font-medium">{formatDate(detail.subscription.currentPeriodEnd)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Trial ends</dt>
                  <dd className="font-medium">{formatDate(detail.subscription.trialEndsAt)}</dd>
                </div>
              </dl>

              <div className="border-t pt-3 space-y-2" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-medium">Record payment</p>
                <div className="grid sm:grid-cols-3 gap-2">
                  <input
                    className="input-field-login text-xs"
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Amount"
                  />
                  <select
                    className="input-field-login text-xs"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option>Bank Transfer</option>
                    <option>Cash</option>
                    <option>Cheque</option>
                    <option>Razorpay</option>
                  </select>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      runAction(() =>
                        recordSubscriptionPayment(company.id, {
                          amount: Number(paymentAmount),
                          method: paymentMethod,
                          notes: paymentNotes || undefined,
                        }),
                      )
                    }
                    className="login-submit text-xs py-2 w-auto"
                  >
                    Record payment
                  </button>
                </div>
                <input
                  className="input-field-login text-xs w-full"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Notes (optional)"
                />
              </div>

              <div className="border-t pt-3 space-y-2" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-medium">Extend trial</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    className="input-field-login text-xs"
                    type="date"
                    value={extendDate}
                    onChange={(e) => setExtendDate(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={submitting || !extendDate}
                    onClick={() =>
                      runAction(() =>
                        extendSubscriptionTrial(company.id, new Date(extendDate).toISOString()),
                      )
                    }
                    className="px-3 py-2 text-xs rounded-lg border"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Extend trial
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                {detail.subscription.status === "Suspended" ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => runAction(() => reactivateSubscription(company.id))}
                    className="px-3 py-2 text-xs rounded-lg text-emerald-700 bg-emerald-50"
                  >
                    Reactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => runAction(() => suspendSubscription(company.id))}
                    className="px-3 py-2 text-xs rounded-lg text-red-700 bg-red-50"
                  >
                    Suspend now
                  </button>
                )}
              </div>

              {detail.payments.length > 0 && (
                <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs font-medium mb-2">Recent payments</p>
                  <ul className="space-y-1 text-xs text-[var(--text-muted)]">
                    {detail.payments.slice(0, 5).map((p) => (
                      <li key={p.id}>
                        {formatCurrency(Number(p.amount))} · {p.method} · {p.periodCovered} ·{" "}
                        {formatDate(p.createdAt)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          {!loading && !detail?.subscription && (
            <p className="text-xs text-[var(--text-muted)]">No subscription record for this company.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlatformCompaniesPage() {
  const { user, logout } = useAuth();
  const [companies, setCompanies] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateOrganizationInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [expiringFilter, setExpiringFilter] = useState(false);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrganizations(
        expiringFilter ? { expiringSoon: 7 } : undefined,
      );
      setCompanies(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load companies."));
    } finally {
      setLoading(false);
    }
  }, [expiringFilter]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createOrganization(form);
      setForm(emptyForm);
      setShowForm(false);
      await loadCompanies();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create company."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (company: OrganizationSummary) => {
    if (
      !window.confirm(
        `Delete "${company.name}" and all its data? This cannot be undone.`,
      )
    ) {
      return;
    }

    setError("");
    try {
      await deleteOrganization(company.id);
      await loadCompanies();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete company."));
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <div className="flex items-center gap-3">
          <div className="brand-mark w-10 h-10 rounded-lg">
            <Gem size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-display text-lg font-semibold">Jewellery ERP</p>
            <p className="text-xs text-[var(--text-muted)]">Platform administration</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--text-muted)] hidden sm:inline">
            {user?.email}
          </span>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border"
            style={{ borderColor: "var(--border)" }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Companies</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Add jewellery businesses to the platform. Each company gets its own
              isolated ERP with its own admin and staff.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpiringFilter((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                expiringFilter ? "bg-amber-50 border-amber-200 text-amber-800" : ""
              }`}
              style={{ borderColor: expiringFilter ? undefined : "var(--border)" }}
            >
              <CalendarClock size={16} />
              Expiring soon (7d)
            </button>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
            >
              <Plus size={16} />
              Add company
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="rounded-xl border p-6 space-y-4"
            style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
          >
            <h2 className="font-medium">New company</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="text-[var(--text-muted)]">Company name</span>
                <input
                  className="input-field-login mt-1"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--text-muted)]">Slug</span>
                <input
                  className="input-field-login mt-1"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  placeholder="company-name"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--text-muted)]">Staff email domain (optional)</span>
                <input
                  className="input-field-login mt-1"
                  value={form.emailDomain}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, emailDomain: e.target.value }))
                  }
                  placeholder="company.com"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--text-muted)]">Admin email</span>
                <input
                  className="input-field-login mt-1"
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, adminEmail: e.target.value }))
                  }
                  placeholder="admin@company.com"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--text-muted)]">Admin name</span>
                <input
                  className="input-field-login mt-1"
                  value={form.adminName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, adminName: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--text-muted)]">Admin password</span>
                <input
                  className="input-field-login mt-1"
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, adminPassword: e.target.value }))
                  }
                  minLength={6}
                  required
                />
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="login-submit px-4 py-2 text-sm w-auto"
              >
                {submitting ? "Creating..." : "Create company"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded-lg border"
                style={{ borderColor: "var(--border)" }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
        >
          {loading ? (
            <p className="p-6 text-sm text-[var(--text-muted)]">Loading companies...</p>
          ) : companies.length === 0 ? (
            <p className="p-6 text-sm text-[var(--text-muted)]">
              {expiringFilter
                ? "No companies expiring in the next 7 days."
                : "No companies yet. Add your first jewellery business above."}
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {companies.map((company) => (
                <li
                  key={company.id}
                  className="p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgb(37 99 235 / 0.12)", color: "#2563eb" }}
                    >
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{company.name}</p>
                        <SubscriptionBadge status={company.subscription?.status} />
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {company.slug}
                        {company.adminEmail ? ` · ${company.adminEmail}` : ""}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {company.branchCount} branch(es) · {company.userCount} user(s)
                        {!company.active && " · Inactive"}
                        {company.subscription && (
                          <> · Period ends {formatDate(company.subscription.currentPeriodEnd)}</>
                        )}
                      </p>
                      <a
                        href={`/shop/${company.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs mt-1 inline-block text-blue-600 hover:underline"
                      >
                        /shop/{company.slug} →
                      </a>
                      <CompanySubscriptionPanel company={company} onUpdated={loadCompanies} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(company)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 flex-shrink-0"
                    aria-label={`Delete ${company.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
