"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import DesignReferenceStrip from "@/app/(components)/production-runs/DesignReferenceStrip";
import ProductionRunElementCard from "@/app/(components)/production-runs/ProductionRunElementCard";
import ProductionRunWizardShell from "@/app/(components)/production-runs/ProductionRunWizardShell";
import StageWorksheetToolbar from "@/app/(components)/production-runs/StageWorksheetToolbar";
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
  fetchProductionRun,
  updateProductionRunItem,
} from "@/lib/api/production-runs";
import { fetchMetalLots, fetchStoneLots } from "@/lib/api/raw-inventory";
import {
  getStageItems,
  getStageProgress,
  isItemStageDone,
} from "@/lib/production-runs/item-helpers";
import { getStageWorksheetConfig } from "@/lib/production-runs/stage-config";
import {
  PRODUCTION_RUN_STEPS,
  slugToProductionRunStage,
  stageToProductionRunSlug,
  isProductionRunStepCurrent,
} from "@/lib/production-runs/stages";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  MetalLot,
  ProductionRun,
  ProductionRunItem,
  ProductionRunStage,
  StoneLot,
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
  stoneLots: StoneLot[],
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
  const [stoneLots, setStoneLots] = useState<StoneLot[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadRun = useCallback(async () => {
    setLoading(true);
    try {
      const [runData, metals, stones] = await Promise.all([
        fetchProductionRun(runId),
        fetchMetalLots(),
        fetchStoneLots(),
      ]);
      setRun(runData);
      setMetalLots(metals);
      setStoneLots(stones);
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
    setSubmitting(true);
    setError("");
    try {
      const result = await completeProductionRunStage(runId, stageSlug, {
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

  if (loading || !run || !stage) {
    return loading ? (
      <PageSkeleton />
    ) : (
      <p className="text-sm text-zinc-500">Invalid stage.</p>
    );
  }

  const isCurrent = isProductionRunStepCurrent(run.currentStage, stage);
  const completedStages = run.stageLogs.map((l) => l.stage);
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
    <ProductionRunWizardShell run={run}>
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {stage === "Casting" && isCurrent && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-blue-200 bg-blue-50 text-blue-900">
          Marking casting received records the lot and weight for this element. Total metal
          for all sets is deducted from <strong>Raw Inventory</strong> when the run
          completes. Finished jewellery SKU is created on the last step.
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
                  {log.stage} — {log.performedByName}
                  {log.notes ? `: ${log.notes}` : ""}
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
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
            className="btn-primary flex-1 px-4 py-2.5 text-sm"
          >
            {nextStep ? `Complete & Next: ${nextStep.label}` : "Complete Run"}
          </button>
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
        message={`Mark "${stepMeta?.label}" as complete and continue?`}
        onConfirm={() => void handleComplete()}
        onCancel={() => setConfirmOpen(false)}
        loading={submitting}
      />
    </ProductionRunWizardShell>
  );
}
