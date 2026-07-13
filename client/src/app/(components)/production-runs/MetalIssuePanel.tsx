"use client";

import { useState } from "react";
import type { MetalLot, ProductionRunMetalIssue, ProductionRunStage } from "@/lib/types";
import {
  fetchMetalIssues,
  issueMetalToKarigar,
  recordMetalReturn,
} from "@/lib/api/production-runs";
import { stageToProductionRunSlug } from "@/lib/production-runs/stages";
import { getApiErrorMessage } from "@/lib/api/client";

const METAL_STAGES: ProductionRunStage[] = ["Wax Pattern", "Casting", "Assembly"];

export const isMetalIssueStage = (stage: ProductionRunStage) =>
  METAL_STAGES.includes(stage);

type MetalIssuePanelProps = {
  runId: string;
  stage: ProductionRunStage;
  purity: string;
  metalLots: MetalLot[];
  issues: ProductionRunMetalIssue[];
  canEdit: boolean;
  goldRatePerGram?: number;
  onUpdated: (issues: ProductionRunMetalIssue[]) => void;
};

export default function MetalIssuePanel({
  runId,
  stage,
  purity,
  metalLots,
  issues,
  canEdit,
  goldRatePerGram = 0,
  onUpdated,
}: MetalIssuePanelProps) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnIssueId, setReturnIssueId] = useState<string | null>(null);
  const [karigarName, setKarigarName] = useState("");
  const [metalLotId, setMetalLotId] = useState("");
  const [weightIssued, setWeightIssued] = useState("");
  const [weightReturned, setWeightReturned] = useState("");
  const [lossReason, setLossReason] = useState("");

  const stageSlug = stageToProductionRunSlug(stage)!;
  const stageIssues = issues.filter((i) => i.stage === stage);
  const openIssue = stageIssues.find((i) => i.status === "Open");
  const returning = returnIssueId
    ? stageIssues.find((i) => i.id === returnIssueId)
    : null;
  const returnedNum = parseFloat(weightReturned) || 0;
  const lossGrams = returning
    ? Math.max(0, returning.weightIssuedGrams - returnedNum)
    : 0;

  const handleIssue = async () => {
    setBusy(true);
    setError("");
    try {
      await issueMetalToKarigar(runId, stageSlug, {
        karigarName,
        weightIssuedGrams: parseFloat(weightIssued),
        metalLotId: metalLotId || undefined,
        purity,
      });
      onUpdated(await fetchMetalIssues(runId));
      setIssueOpen(false);
      setKarigarName("");
      setMetalLotId("");
      setWeightIssued("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to issue metal."));
    } finally {
      setBusy(false);
    }
  };

  const handleReturn = async () => {
    if (!returnIssueId) return;
    setBusy(true);
    setError("");
    try {
      await recordMetalReturn(runId, returnIssueId, {
        weightReturnedGrams: returnedNum,
        lossReason: lossGrams > 0 ? lossReason : undefined,
      });
      onUpdated(await fetchMetalIssues(runId));
      setReturnIssueId(null);
      setWeightReturned("");
      setLossReason("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to record return."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">Metal issue / recovery</h3>
        {canEdit && !openIssue && (
          <button
            type="button"
            onClick={() => setIssueOpen(true)}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            Issue Metal
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {issueOpen && canEdit && (
        <div className="grid gap-2 sm:grid-cols-2 bg-white border border-zinc-200 rounded-lg p-3">
          <input
            value={karigarName}
            onChange={(e) => setKarigarName(e.target.value)}
            placeholder="Karigar name"
            className="input-field px-3 py-2 text-sm"
          />
          <select
            value={metalLotId}
            onChange={(e) => setMetalLotId(e.target.value)}
            className="input-field px-3 py-2 text-sm"
          >
            <option value="">Select metal lot (optional)</option>
            {metalLots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.lotNumber} — {lot.weightGrams}g
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.001"
            value={weightIssued}
            onChange={(e) => setWeightIssued(e.target.value)}
            placeholder="Weight to issue (g)"
            className="input-field px-3 py-2 text-sm"
          />
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleIssue()}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              Confirm Issue
            </button>
            <button
              type="button"
              onClick={() => setIssueOpen(false)}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {stageIssues.length === 0 ? (
        <p className="text-xs text-zinc-500">No metal issued for this stage yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {stageIssues.map((issue) => (
            <li
              key={issue.id}
              className="flex flex-wrap items-center justify-between gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-2"
            >
              <div>
                <span className="font-medium">{issue.karigarName}</span>
                <span className="text-zinc-500 ml-2">
                  {issue.weightIssuedGrams}g issued
                  {issue.status === "Settled" &&
                    ` · ${issue.weightReturnedGrams}g returned · ${issue.weightLossGrams}g loss`}
                </span>
              </div>
              {canEdit && issue.status === "Open" && (
                <button
                  type="button"
                  onClick={() => {
                    setReturnIssueId(issue.id);
                    setWeightReturned(String(issue.weightIssuedGrams));
                  }}
                  className="btn-secondary px-3 py-1 text-xs"
                >
                  Record Return
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {returnIssueId && returning && canEdit && (
        <div className="bg-white border border-zinc-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-zinc-700">
            Return for {returning.karigarName} (issued {returning.weightIssuedGrams}g)
          </p>
          <input
            type="number"
            step="0.001"
            value={weightReturned}
            onChange={(e) => setWeightReturned(e.target.value)}
            className="input-field w-full px-3 py-2 text-sm"
          />
          {lossGrams > 0 && (
            <>
              <p className="text-xs text-amber-700">
                Loss: {lossGrams.toFixed(3)}g
                {goldRatePerGram > 0 &&
                  ` · ₹${(lossGrams * goldRatePerGram).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
              </p>
              <input
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                placeholder="Loss reason (required)"
                className="input-field w-full px-3 py-2 text-sm"
              />
            </>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleReturn()}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              Save Return
            </button>
            <button
              type="button"
              onClick={() => setReturnIssueId(null)}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
