"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import DesignReferenceStrip from "@/app/(components)/production-runs/DesignReferenceStrip";
import MetalReservationBanner from "@/app/(components)/production-runs/MetalReservationBanner";
import ProductionRunElementCard from "@/app/(components)/production-runs/ProductionRunElementCard";
import ProductionRunWizardShell from "@/app/(components)/production-runs/ProductionRunWizardShell";
import StageWorksheetToolbar from "@/app/(components)/production-runs/StageWorksheetToolbar";
import MetalIssuePanel, { isMetalIssueStage } from "@/app/(components)/production-runs/MetalIssuePanel";
import {
  CastingFields,
  StageCheckoffField,
  StoneSettingFields,
  WaxPatternFields,
} from "@/app/(components)/production-runs/StageItemFields";
import { useAuth } from "@/lib/auth/auth-context";
import { canUpdateProductionRunItems } from "@/lib/auth/permissions";
import { useProductionRuns } from "@/lib/production-runs/production-runs-context";
import {
  completeProductionRunStage,
  fetchMetalIssues,
  fetchProductionRun,
  rejectProductionRunStage,
  updateProductionRunItem,
} from "@/lib/api/production-runs";
import { fetchCurrentMarketRates } from "@/lib/api/market-rates";
import { fetchMetalLots, fetchCertifiedStoneLots } from "@/lib/api/raw-inventory";
import {
  getStageItems,
  getStageProgress,
  isItemStageDone,
} from "@/lib/production-runs/item-helpers";
import { getStageWorksheetConfig } from "@/lib/production-runs/stage-config";
import {
  PRODUCTION_RUN_STAGES,
  PRODUCTION_RUN_STEPS,
  slugToProductionRunStage,
  stageToProductionRunSlug,
  isProductionRunStepCurrent,
} from "@/lib/production-runs/stages";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  CertifiedStoneLot,
  MetalLot,
  ProductionRun,
  ProductionRunItem,
  ProductionRunMetalIssue,
  ProductionRunStage,
  UpdateProductionRunItemInput,
} from "@/lib/types";

const inputClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

function isItemDoneForStage(item: ProductionRunItem, stage: ProductionRunStage): boolean {
  const config = getStageWorksheetConfig(stage);
  if (config.mode === "wax") {
    return item.elementType === "Stone"
      ? true
      : item.waxCount != null && item.waxCount >= 0;
  }
  if (config.mode === "casting") {
    if (item.elementType === "Casting") return item.castingReceived;
    return true;
  }
  if (config.mode === "stone-setting") {
    return (
      (item.czStones != null && item.czStones >= 0) ||
      (item.czWeight != null && item.czWeight > 0)
    );
  }
  if (config.mode === "checkoff" && config.checkoffStage) {
    return isItemStageDone(item, config.checkoffStage);
  }
  return true;
}

function renderStageFields(
  stage: ProductionRunStage,
  item: ProductionRunItem,
  canEdit: boolean,
  metalLots: MetalLot[],
  stoneLots: CertifiedStoneLot[],
  onPatch: (input: UpdateProductionRunItemInput) => Promise<void>,
) {
  const config = getStageWorksheetConfig(stage);

  switch (config.mode) {
    case "wax":
      return <WaxPatternFields item={item} canEdit={canEdit} onPatch={onPatch} />;
    case "casting":
      return (
        <CastingFields
          item={item}
          canEdit={canEdit}
          metalLots={metalLots}
          stoneLots={stoneLots}
          onPatch={onPatch}
        />
      );
    case "stone-setting":
      return <StoneSettingFields item={item} canEdit={canEdit} onPatch={onPatch} />;
    case "checkoff":
      return (
        <StageCheckoffField
          item={item}
          stage={stage}
          checkoffStage={config.checkoffStage!}
          canEdit={canEdit}
          onPatch={onPatch}
        />
      );
    default:
      return null;
  }
}

export default function ProductionRunStagePage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.id as string;
  const stageSlug = params.stageSlug as string;
  const stage = slugToProductionRunStage(stageSlug);

  const { user } = useAuth();
  const canEditItems = user ? canUpdateProductionRunItems(user.role) : false;
  const { refresh: refreshList } = useProductionRuns();

  const [run, setRun] = useState<ProductionRun | null>(null);
  const [metalLots, setMetalLots] = useState<MetalLot[]>([]);
  const [stoneLots, setStoneLots] = useState<CertifiedStoneLot[]>([]);
  const [notes, setNotes] = useState("");
  const [karigarName, setKarigarName] = useState("");
  const [metalIssues, setMetalIssues] = useState<ProductionRunMetalIssue[]>([]);
  const [goldRate, setGoldRate] = useState(0);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectToStage, setRejectToStage] = useState<ProductionRunStage>("Wax Pattern");
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadRun = useCallback(async () => {
    setLoading(true);
    try {
      const [runData, metals, stones, issues, rates] = await Promise.all([
        fetchProductionRun(runId),
        fetchMetalLots(),
        fetchCertifiedStoneLots(),
        fetchMetalIssues(runId).catch(() => []),
        fetchCurrentMarketRates().catch(() => null),
      ]);
      setRun(runData);
      setMetalLots(metals);
      setStoneLots(stones);
      setMetalIssues(issues);
      setGoldRate(rates?.gold22k ?? 0);
      const latestKarigar = [...runData.stageLogs]
        .reverse()
        .find((l) => l.karigarName)?.karigarName;
      if (latestKarigar) setKarigarName(latestKarigar);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load production run."));
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void loadRun();
  }, [loadRun]);

  const patchItem = async (
    itemId: string,
    input: UpdateProductionRunItemInput,
  ) => {
    const updated = await updateProductionRunItem(runId, itemId, input);
    setRun(updated);
    await refreshList();
  };

  const stepIndex = PRODUCTION_RUN_STEPS.findIndex((s) => s.slug === stageSlug);
  const prevStep = stepIndex > 0 ? PRODUCTION_RUN_STEPS[stepIndex - 1] : null;
  const nextStep =
    stepIndex >= 0 && stepIndex < PRODUCTION_RUN_STEPS.length - 1
      ? PRODUCTION_RUN_STEPS[stepIndex + 1]
      : null;

  const handleComplete = async () => {
    if (!run || !stage) return;
    if (!karigarName.trim()) {
      setError("Assigned karigar is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await completeProductionRunStage(runId, stageSlug, {
        karigarName: karigarName.trim(),
        notes: notes.trim() || undefined,
      });
      await refreshList();
      const updated = await fetchProductionRun(runId);
      setRun(updated);

      const nextSlug = stageToProductionRunSlug(result.currentStage);
      if (run.status !== "Completed" && nextSlug && nextSlug !== stageSlug) {
        router.push(`/production-runs/${runId}/${nextSlug}`);
      } else if (updated.status === "Completed") {
        router.push(`/designs?design=${run.designId}`);
      } else {
        await loadRun();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to complete stage."));
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const handleReject = async () => {
    if (!run || !stage || !rejectReason.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await rejectProductionRunStage(runId, stageSlug, {
        rejectedToStage: rejectToStage,
        reason: rejectReason.trim(),
        karigarName: karigarName.trim() || undefined,
      });
      await refreshList();
      const updated = await fetchProductionRun(runId);
      setRun(updated);
      const slug = stageToProductionRunSlug(updated.currentStage);
      if (slug) router.push(`/production-runs/${runId}/${slug}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reject stage."));
    } finally {
      setSubmitting(false);
      setRejectOpen(false);
    }
  };

  if (loading || !run || !stage) {
    return loading ? (
      <PageSkeleton />
    ) : (
      <p className="text-sm text-zinc-500">Invalid stage.</p>
    );
  }

  const isCurrent = isProductionRunStepCurrent(run.currentStage, stage);
  const completedStages = run.stageLogs
    .filter((l) => l.action === "Completed" || !l.action)
    .map((l) => l.stage);
  const earlierStages = PRODUCTION_RUN_STAGES.slice(0, PRODUCTION_RUN_STAGES.indexOf(stage));
  const isDone = completedStages.includes(stage);
  const stageItems = getStageItems(run, stage);
  const progress = getStageProgress(run, stage);
  const worksheetConfig = getStageWorksheetConfig(stage);
  const stepMeta = PRODUCTION_RUN_STEPS.find((s) => s.slug === stageSlug);
  const canEdit = canEditItems && isCurrent;
  const currentStepSlug = stageToProductionRunSlug(run.currentStage);
  const waxRequiredItems = stageItems.filter((item) => item.elementType !== "Stone");
  const waxReadyCount = waxRequiredItems.filter(
    (item) => item.waxCount != null && item.waxCount >= 0,
  ).length;

  return (
    <div className="page-content">
      <ProductionRunWizardShell run={run}>
      <MetalReservationBanner
        run={run}
        canManage={canEditItems}
        onUpdated={(updated) => {
          setRun(updated);
          void refreshList();
        }}
      />
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {run.metalStockWarning && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-800">
          <p className="font-medium">Metal stock was insufficient when this run was created</p>
          <p className="mt-1">
            This run should not have been started: ordered {run.metalStockWarning.requestedSets} sets
            ({run.metalStockWarning.requiredGrams}g needed) but raw inventory only had{" "}
            {run.metalStockWarning.availableGrams}g of {run.metalStockWarning.metal}{" "}
            {run.metalStockWarning.purity}. Open the run again after adding stock to trigger a
            repair, or delete and recreate the run.
          </p>
        </div>
      )}

      {stage === "Casting" && isCurrent && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-blue-200 bg-blue-50 text-blue-900">
          Marking casting received records the lot and weight for this element. Total metal
          for all sets was deducted from <strong>Raw Inventory</strong> when this production
          run was started. Finished jewellery SKU is created on the last step.
        </div>
      )}

      {isCurrent && canEditItems ? (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-emerald-200 bg-emerald-50 text-emerald-800">
          <p className="font-medium">Active step — you can edit this worksheet.</p>
          <p className="mt-1 text-emerald-700">
            Fill in each element below, then use{" "}
            <strong>
              {nextStep ? `Complete & Next: ${nextStep.label}` : "Complete Run"}
            </strong>{" "}
            at the bottom to move forward.
          </p>
        </div>
      ) : !isCurrent && currentStepSlug ? (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-amber-200 bg-amber-50 text-amber-800">
          <p className="font-medium">
            This step is read-only. Current active step: {run.currentStage}
          </p>
          <Link
            href={`/production-runs/${runId}/${currentStepSlug}`}
            className="inline-block mt-2 text-sm font-medium underline"
          >
            Go to current step →
          </Link>
        </div>
      ) : !canEditItems && isCurrent ? (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-amber-200 bg-amber-50 text-amber-800">
          Your role can view this worksheet but not edit it. Ask a production manager
          or karigar to update fields.
        </div>
      ) : null}

      {stage === "Wax Pattern" && isCurrent && waxRequiredItems.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-zinc-200 bg-zinc-50 text-zinc-700">
          Wax mould progress: {waxReadyCount}/{waxRequiredItems.length} elements ready
          {waxReadyCount < waxRequiredItems.length
            ? " — enter wax counts for all non-stone elements"
            : " — ready to complete this step"}
        </div>
      )}

      <DesignReferenceStrip photos={run.designPhotos} />

      {isCurrent && canEditItems && (
        <div className="surface-card p-4 mb-4">
          <label className={labelClass}>Assigned Karigar *</label>
          <input
            value={karigarName}
            onChange={(e) => setKarigarName(e.target.value)}
            className={inputClass}
            placeholder="Name of karigar doing this stage"
            required
          />
        </div>
      )}

      {isCurrent && isMetalIssueStage(stage) && (
        <div className="mb-4">
          <MetalIssuePanel
            runId={runId}
            stage={stage}
            purity={run.designPurity ?? "22K"}
            metalLots={metalLots}
            issues={metalIssues}
            canEdit={canEdit}
            goldRatePerGram={goldRate}
            onUpdated={setMetalIssues}
          />
        </div>
      )}

      <div className="surface-card p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">{stepMeta?.label}</h2>
            <p className="text-sm text-zinc-600">{worksheetConfig.instructions}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                {stageItems.length} element{stageItems.length !== 1 ? "s" : ""}
              </span>
              {worksheetConfig.mode === "checkoff" && (
                <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-800">
                  {progress.done}/{progress.total} checked off
                </span>
              )}
              {run.designMetal && (
                <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                  {run.designMetal} {run.designPurity ?? ""}
                </span>
              )}
            </div>
          </div>
          <StageWorksheetToolbar run={run} stage={stage} />
        </div>

        {stageItems.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No elements apply to this stage for this run.
          </p>
        ) : (
          <div className="space-y-4">
            {stageItems.map((item, index) => (
              <ProductionRunElementCard
                key={item.id}
                item={item}
                index={index}
                done={isItemDoneForStage(item, stage)}
              >
                {renderStageFields(
                  stage,
                  item,
                  canEdit,
                  metalLots,
                  stoneLots,
                  (input) => patchItem(item.id, input),
                )}
              </ProductionRunElementCard>
            ))}
          </div>
        )}

        {isCurrent && canEditItems && (
          <div>
            <label className={labelClass}>Stage notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} min-h-[80px]`}
              placeholder="Any issues, batch notes, or handover details for the next step…"
            />
          </div>
        )}

        {!canEditItems && isCurrent && (
          <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
            You can view this worksheet and download exports. Ask a production manager
            or karigar to update fields if changes are needed.
          </p>
        )}

        {isCurrent && canEditItems && nextStep && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <p className="font-medium text-zinc-900">Ready for the next step?</p>
            <p className="mt-1">
              When every required field on this page is filled, scroll down and click{" "}
              <strong>Complete & Next: {nextStep.label}</strong>.
            </p>
          </div>
        )}

        {isDone && !isCurrent && (
          <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
            This stage was completed.
          </p>
        )}
      </div>

      {run.stageLogs.length > 0 && (
        <div className="surface-card p-5 mt-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Stage history
          </h3>
          <ul className="space-y-2 text-sm">
            {run.stageLogs.map((log) => (
              <li key={log.id} className="flex justify-between gap-4 text-zinc-600">
                <span>
                  <span
                    className={
                      log.action === "Rejected"
                        ? "text-red-700 font-medium"
                        : log.action === "Completed"
                          ? "text-emerald-700"
                          : ""
                    }
                  >
                    {log.action ?? "Completed"}
                  </span>
                  {" · "}
                  {log.stage}
                  {log.karigarName ? ` · ${log.karigarName}` : ""}
                  {log.action === "Rejected" && log.rejectedToStage
                    ? ` → sent back to ${log.rejectedToStage}`
                    : ""}
                  {log.rejectionReason ? `: ${log.rejectionReason}` : ""}
                  {log.notes ? ` — ${log.notes}` : ""}
                  {" · "}
                  {log.performedByName}
                </span>
                <span className="text-xs text-zinc-400 shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        {prevStep && (
          <Link
            href={`/production-runs/${runId}/${prevStep.slug}`}
            className="btn-secondary flex-1 px-4 py-2.5 text-sm text-center"
          >
            Back
          </Link>
        )}
        {isCurrent && canEditItems && (
          <>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={submitting || !karigarName.trim()}
              className="btn-primary flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {nextStep ? `Complete & Next: ${nextStep.label}` : "Complete Run"}
            </button>
            {earlierStages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setRejectToStage(earlierStages[earlierStages.length - 1]!);
                  setRejectOpen(true);
                }}
                disabled={submitting}
                className="btn-secondary flex-1 px-4 py-2.5 text-sm text-red-600 border-red-200"
              >
                Reject & Send Back
              </button>
            )}
          </>
        )}
        {!isCurrent && nextStep && completedStages.includes(stage) && (
          <Link
            href={`/production-runs/${runId}/${nextStep.slug}`}
            className="btn-primary flex-1 px-4 py-2.5 text-sm text-center"
          >
            Next: {nextStep.label}
          </Link>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        message={`Mark "${stepMeta?.label}" as complete and continue? Karigar: ${karigarName || "(not set)"}`}
        onConfirm={() => void handleComplete()}
        onCancel={() => setConfirmOpen(false)}
        loading={submitting}
      />

      {rejectOpen && (
        <div className="modal-overlay">
          <div className="modal-panel relative z-10 max-w-md w-full">
            <div className="modal-header">Reject &amp; send back</div>
            <div className="modal-body space-y-3">
              <p className="text-sm text-zinc-600">Send this piece back for rework?</p>
              <div>
                <label className={labelClass}>Send back to stage</label>
                <select
                  value={rejectToStage}
                  onChange={(e) => setRejectToStage(e.target.value as ProductionRunStage)}
                  className={inputClass}
                >
                  {earlierStages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Reason *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className={`${inputClass} min-h-[80px]`}
                  placeholder="Describe the defect or issue…"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                disabled={submitting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReject()}
                disabled={submitting || !rejectReason.trim()}
                className="btn-primary"
              >
                {submitting ? "Saving…" : "Confirm reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProductionRunWizardShell>
    </div>
  );
}
