"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import {
  addLeadFollowUp,
  completeLeadFollowUp,
  convertLead,
  fetchLead,
  moveLeadStage,
} from "@/lib/api/leads";
import { getApiErrorMessage } from "@/lib/api/client";
import type { LeadDetail, LeadStage } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function LeadDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followUpDue, setFollowUpDue] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [converting, setConverting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLead(await fetchLead(id));
    } catch (err) {
      setError(getApiErrorMessage(err, "Lead not found."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStage = async (stage: LeadStage) => {
    if (stage === "Lost" && !lostReason.trim()) {
      setError("Lost reason is required when marking a lead as Lost.");
      return;
    }
    try {
      const updated = await moveLeadStage(
        id,
        stage,
        stage === "Lost" ? lostReason : undefined,
      );
      setLead((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update stage."));
    }
  };

  const handleAddFollowUp = async () => {
    if (!followUpDue) return;
    try {
      const row = await addLeadFollowUp(id, {
        dueAt: new Date(followUpDue).toISOString(),
        note: followUpNote || undefined,
      });
      setLead((prev) =>
        prev ? { ...prev, followUps: [row, ...prev.followUps] } : prev,
      );
      setFollowUpDue("");
      setFollowUpNote("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not add follow-up."));
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      const { customerId } = await convertLead(id);
      router.push(`/sales?customerId=${encodeURIComponent(customerId)}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not convert lead."));
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (!lead) {
    return (
      <div className="page-content">
        <p className="text-sm text-red-600">{error || "Lead not found."}</p>
      </div>
    );
  }

  return (
    <div className="page-content space-y-4">
      <PageHeader
        title={lead.name}
        subtitle={`${lead.stage} · ${lead.mobile}`}
        action={
          <Link href="/leads" className="btn-secondary text-sm">
            ← Pipeline
          </Link>
        }
      />

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="surface-card rounded-lg p-4 space-y-2 lg:col-span-1">
          <p className="text-sm">
            <span className="text-zinc-500">Source:</span> {lead.source}
          </p>
          {lead.email && (
            <p className="text-sm">
              <span className="text-zinc-500">Email:</span> {lead.email}
            </p>
          )}
          {lead.interestedIn && (
            <p className="text-sm">
              <span className="text-zinc-500">Interested in:</span> {lead.interestedIn}
            </p>
          )}
          {(lead.budgetMin != null || lead.budgetMax != null) && (
            <p className="text-sm">
              <span className="text-zinc-500">Budget:</span>{" "}
              {lead.budgetMin != null ? formatCurrency(lead.budgetMin) : "—"} –{" "}
              {lead.budgetMax != null ? formatCurrency(lead.budgetMax) : "—"}
            </p>
          )}
          {lead.assignedToName && (
            <p className="text-sm">
              <span className="text-zinc-500">Assigned:</span> {lead.assignedToName}
            </p>
          )}

          <div className="pt-3 flex flex-wrap gap-2">
            {lead.stage !== "Won" && lead.stage !== "Lost" && (
              <>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() => void handleConvert()}
                  disabled={converting}
                >
                  Convert & Create Order
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => void handleStage("Lost")}
                >
                  Mark Lost
                </button>
              </>
            )}
          </div>

          {lead.stage !== "Won" && lead.stage !== "Lost" && (
            <div className="pt-2">
              <label className={labelClass}>Lost reason (if marking lost)</label>
              <input
                className={fieldClass}
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Optional unless marking lost"
              />
            </div>
          )}
        </div>

        <div className="surface-card rounded-lg p-4 lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-sm font-semibold mb-2">Follow-ups</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <input
                type="datetime-local"
                className={fieldClass}
                value={followUpDue}
                onChange={(e) => setFollowUpDue(e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Note"
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => void handleAddFollowUp()}
              >
                Add follow-up
              </button>
            </div>
            <ul className="space-y-2">
              {lead.followUps.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between text-sm border-b border-zinc-100 py-2"
                >
                  <div>
                    <p>{formatDate(f.dueAt)}</p>
                    {f.note && <p className="text-xs text-zinc-500">{f.note}</p>}
                  </div>
                  {!f.completedAt && (
                    <button
                      type="button"
                      className="text-xs text-emerald-700"
                      onClick={() =>
                        void completeLeadFollowUp(id, f.id).then(load)
                      }
                    >
                      Complete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-2">Appointments</h2>
            {lead.appointments.length === 0 ? (
              <p className="text-sm text-zinc-400">No appointments yet.</p>
            ) : (
              <ul className="space-y-2">
                {lead.appointments.map((a) => (
                  <li key={a.id} className="text-sm border-b border-zinc-100 py-2">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-zinc-500">{formatDate(a.scheduledAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
