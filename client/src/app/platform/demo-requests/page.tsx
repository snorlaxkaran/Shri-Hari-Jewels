"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import PlatformHeader from "@/app/platform/(components)/PlatformHeader";
import {
  demoRequestWhatsAppUrl,
  fetchDemoRequests,
  updateDemoRequestStatus,
  type DemoRequest,
  type DemoRequestStatus,
} from "@/lib/api/demo-requests";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

const STATUSES: DemoRequestStatus[] = [
  "New",
  "Contacted",
  "Demo Scheduled",
  "Won",
  "Lost",
];

const statusStyles: Record<DemoRequestStatus, string> = {
  New: "text-blue-700 bg-blue-50",
  Contacted: "text-violet-700 bg-violet-50",
  "Demo Scheduled": "text-amber-700 bg-amber-50",
  Won: "text-emerald-700 bg-emerald-50",
  Lost: "text-zinc-600 bg-zinc-100",
};

export default function PlatformDemoRequestsPage() {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<DemoRequestStatus | "All">("All");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRequests(await fetchDemoRequests());
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load demo requests."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered =
    statusFilter === "All"
      ? requests
      : requests.filter((row) => row.status === statusFilter);

  const handleStatusChange = async (id: string, status: DemoRequestStatus) => {
    try {
      const updated = await updateDemoRequestStatus(id, status);
      setRequests((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                status: updated.status,
              }
            : row,
        ),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update status."));
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <PlatformHeader />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Demo requests</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Leads from the public onboarding page. When{" "}
              <code className="text-xs">PLATFORM_DEMO_WHATSAPP</code> is set, visitors
              are prompted to send you a WhatsApp after submitting the form.
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as DemoRequestStatus | "All")
            }
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
          >
            <option value="All">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-xl border px-6 py-12 text-center text-sm text-[var(--text-muted)]"
            style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
          >
            No demo requests yet.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border p-4 sm:p-5"
                style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-semibold text-lg">{row.businessName}</h2>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">
                      {row.contactName}
                      {row.city ? ` · ${row.city}` : ""}
                      {row.businessType ? ` · ${row.businessType}` : ""}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      Submitted {formatDate(row.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex px-2.5 py-1 rounded text-xs font-medium ${statusStyles[row.status]}`}
                  >
                    {row.status}
                  </span>
                </div>

                {row.message && (
                  <p className="mt-3 text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                    {row.message}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href={`tel:${row.phone}`}
                    className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Phone size={15} />
                    {row.phone}
                  </a>
                  {row.email && (
                    <a
                      href={`mailto:${row.email}`}
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {row.email}
                    </a>
                  )}
                  <a
                    href={demoRequestWhatsAppUrl(row.phone, row)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800"
                  >
                    <MessageCircle size={15} />
                    Reply on WhatsApp
                  </a>
                  <select
                    value={row.status}
                    onChange={(e) =>
                      void handleStatusChange(row.id, e.target.value as DemoRequestStatus)
                    }
                    className="ml-auto rounded-lg border px-2.5 py-1.5 text-sm"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--bg-page)",
                    }}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
