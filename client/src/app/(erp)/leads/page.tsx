"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { createLead, fetchLeads, moveLeadStage } from "@/lib/api/leads";
import { fetchBranches } from "@/lib/api/branches";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Lead, LeadSource, LeadStage } from "@/lib/types";

const STAGES: LeadStage[] = [
  "New",
  "Qualification",
  "Follow-up",
  "Opportunity",
  "Quotation",
  "Won",
  "Lost",
];

const STAGE_COLORS: Record<LeadStage, string> = {
  New: "border-blue-200 bg-blue-50",
  Qualification: "border-violet-200 bg-violet-50",
  "Follow-up": "border-amber-200 bg-amber-50",
  Opportunity: "border-emerald-200 bg-emerald-50",
  Quotation: "border-cyan-200 bg-cyan-50",
  Won: "border-green-300 bg-green-50",
  Lost: "border-zinc-300 bg-zinc-100",
};

const SOURCES: LeadSource[] = [
  "Walk-in",
  "Referral",
  "Phone",
  "WhatsApp",
  "Instagram",
  "Website",
  "Other",
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [source, setSource] = useState<LeadSource>("Walk-in");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLeads(await fetchLeads());
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load leads."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetchBranches()
      .then((rows) => {
        setBranches(rows.map((b) => ({ id: b.id, name: b.name })));
        if (rows[0]) setBranchId(rows[0].id);
      })
      .catch(() => undefined);
  }, []);

  const handleCreate = async () => {
    if (!branchId || !name.trim() || !mobile.trim()) {
      setError("Branch, name, and mobile are required.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const lead = await createLead({
        branchId,
        name: name.trim(),
        mobile: mobile.trim(),
        source,
      });
      setLeads((prev) => [lead, ...prev]);
      setShowCreate(false);
      setName("");
      setMobile("");
      setSource("Walk-in");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create lead."));
    } finally {
      setCreating(false);
    }
  };

  const byStage = useMemo(() => {
    const map = new Map<LeadStage, Lead[]>();
    for (const stage of STAGES) map.set(stage, []);
    for (const lead of leads) {
      map.get(lead.stage)?.push(lead);
    }
    return map;
  }, [leads]);

  const handleMoveNext = async (lead: Lead) => {
    const idx = STAGES.indexOf(lead.stage);
    const next = STAGES[idx + 1];
    if (!next || next === "Won" || next === "Lost") return;
    try {
      const updated = await moveLeadStage(lead.id, next);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not move lead."));
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title="Leads"
        subtitle="CRM pipeline — drag cards or move to next stage"
        action={
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={() => setShowCreate(true)}
            >
              New lead
            </button>
            <Link href="/leads/calendar" className="btn-secondary text-sm">
              Calendar
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="surface-card rounded-lg p-4 mb-4 space-y-3">
          <h2 className="text-sm font-semibold">Add lead</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              className="input-field px-3 py-2 text-sm"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <input
              className="input-field px-3 py-2 text-sm"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="input-field px-3 py-2 text-sm"
              placeholder="Mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
            <select
              className="input-field px-3 py-2 text-sm"
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={creating}
              onClick={() => void handleCreate()}
            >
              {creating ? "Saving…" : "Save lead"}
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const cards = byStage.get(stage) ?? [];
          return (
            <div
              key={stage}
              className={`min-w-[220px] flex-1 rounded-xl border p-3 ${STAGE_COLORS[stage]}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-800">{stage}</h2>
                <span className="text-xs text-zinc-500">{cards.length}</span>
              </div>
              <div className="space-y-2">
                {cards.map((lead) => (
                  <div
                    key={lead.id}
                    className="surface-card rounded-lg p-3 shadow-sm border border-zinc-200/80"
                  >
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-sm font-medium text-zinc-900 hover:underline"
                    >
                      {lead.name}
                    </Link>
                    <p className="text-xs text-zinc-500 mt-0.5">{lead.mobile}</p>
                    {lead.interestedIn && (
                      <p className="text-xs text-zinc-600 mt-1 truncate">
                        {lead.interestedIn}
                      </p>
                    )}
                    {lead.assignedToName && (
                      <p className="text-xs text-zinc-400 mt-1">{lead.assignedToName}</p>
                    )}
                    {stage !== "Won" && stage !== "Lost" && (
                      <button
                        type="button"
                        className="mt-2 text-xs text-amber-800 hover:underline"
                        onClick={() => void handleMoveNext(lead)}
                      >
                        Move to next stage →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
