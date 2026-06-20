"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import ProductionRunWizardShell from "@/app/(components)/production-runs/ProductionRunWizardShell";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canManageProductionRuns,
  canUpdateProductionRunItems,
} from "@/lib/auth/permissions";
import { useProductionRuns } from "@/lib/production-runs/production-runs-context";
import {
  completeProductionRunStage,
  fetchProductionRun,
  updateProductionRunItem,
} from "@/lib/api/production-runs";
import { fetchMetalLots, fetchStoneLots } from "@/lib/api/raw-inventory";
import {
  PRODUCTION_RUN_STEPS,
  slugToProductionRunStage,
  stageToProductionRunSlug,
  isProductionRunStepCurrent,
} from "@/lib/production-runs/stages";
import {
  expectedElementWeight,
  weightMismatchMessage,
  weightsMatch,
} from "@/lib/weight-reconciliation";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  MetalLot,
  ProductionRun,
  ProductionRunItem,
  StoneLot,
  UpdateProductionRunItemInput,
} from "@/lib/types";

const inputClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

function WaxPatternFields({
  item,
  canEdit,
  onPatch,
}: {
  item: ProductionRunItem;
  canEdit: boolean;
  onPatch: (input: UpdateProductionRunItemInput) => Promise<void>;
}) {
  const [waxCount, setWaxCount] = useState(
    item.waxCount !== undefined ? String(item.waxCount) : "",
  );

  useEffect(() => {
    setWaxCount(item.waxCount !== undefined ? String(item.waxCount) : "");
  }, [item.waxCount]);

  const handleBlur = () => {
    const current = item.waxCount !== undefined ? String(item.waxCount) : "";
    if (waxCount === current) return;
    const parsed = waxCount === "" ? null : parseInt(waxCount, 10);
    if (waxCount !== "" && (parsed === null || Number.isNaN(parsed))) return;
    void onPatch({ waxCount: parsed });
  };

  return (
    <div className="surface-card p-4 space-y-2">
      <p className="font-medium text-zinc-900">{item.elementName}</p>
      <p className="text-xs text-zinc-500">{item.elementType}</p>
      <div>
        <label className={labelClass}>Wax Moulds</label>
        <input
          type="number"
          min={0}
          value={waxCount}
          onChange={(e) => setWaxCount(e.target.value)}
          onBlur={handleBlur}
          disabled={!canEdit}
          className={inputClass}
        />
      </div>
    </div>
  );
}

function CastingFields({
  item,
  canEdit,
  metalLots,
  stoneLots,
  onPatch,
}: {
  item: ProductionRunItem;
  canEdit: boolean;
  metalLots: MetalLot[];
  stoneLots: StoneLot[];
  onPatch: (input: UpdateProductionRunItemInput) => Promise<void>;
}) {
  const needsMetalLot = item.elementType === "Casting";
  const needsStoneLot =
    item.elementType === "Stone" || item.elementType === "Motif";

  const [draft, setDraft] = useState({
    metalLotId: item.metalLotId ?? "",
    stoneLotId: item.stoneLotId ?? "",
    metalWeightGrams:
      item.metalWeightGrams !== undefined ? String(item.metalWeightGrams) : "",
    castingReceived: item.castingReceived,
  });
  const [metalWeightOverrideNote, setMetalWeightOverrideNote] = useState("");
  const [rowError, setRowError] = useState("");

  useEffect(() => {
    setDraft({
      metalLotId: item.metalLotId ?? "",
      stoneLotId: item.stoneLotId ?? "",
      metalWeightGrams:
        item.metalWeightGrams !== undefined ? String(item.metalWeightGrams) : "",
      castingReceived: item.castingReceived,
    });
  }, [item]);

  const expectedCastingWeight = expectedElementWeight(
    item.weightGramsPerPc,
    item.qtyPerSet,
  );
  const parsedMetalWeight =
    draft.metalWeightGrams === "" ? null : parseFloat(draft.metalWeightGrams);

  const saveField = async (
    field: keyof UpdateProductionRunItemInput,
    value: UpdateProductionRunItemInput[keyof UpdateProductionRunItemInput],
    extra?: Pick<UpdateProductionRunItemInput, "metalWeightOverrideNote">,
  ) => {
    setRowError("");
    try {
      await onPatch({ [field]: value, ...extra });
    } catch (err) {
      setRowError(getApiErrorMessage(err, "Failed to save."));
    }
  };

  const handleMetalWeightBlur = () => {
    const raw = draft.metalWeightGrams;
    const current =
      item.metalWeightGrams !== undefined ? String(item.metalWeightGrams) : "";
    if (raw === current) return;
    const parsed = raw === "" ? null : parseFloat(raw);
    if (raw !== "" && (parsed === null || Number.isNaN(parsed))) return;

    if (
      parsed !== null &&
      !weightsMatch(parsed, expectedCastingWeight) &&
      !metalWeightOverrideNote.trim()
    ) {
      setRowError(
        weightMismatchMessage(
          parsed,
          expectedCastingWeight,
          `Casting weight for "${item.elementName}"`,
        ),
      );
      return;
    }

    void saveField("metalWeightGrams", parsed, {
      metalWeightOverrideNote: metalWeightOverrideNote.trim() || undefined,
    });
  };

  return (
    <div className="surface-card p-4 space-y-3">
      <p className="font-medium text-zinc-900">{item.elementName}</p>
      <p className="text-xs text-zinc-500">{item.elementType}</p>

      {needsMetalLot && canEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Metal lot</label>
            <select
              value={draft.metalLotId}
              onChange={(e) => {
                setDraft((d) => ({ ...d, metalLotId: e.target.value }));
                void saveField("metalLotId", e.target.value || null);
              }}
              disabled={item.rawMaterialDeducted}
              className={inputClass}
            >
              <option value="">Select metal lot…</option>
              {metalLots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.lotNumber} ({lot.weightGrams}g)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Metal weight (g)
              {expectedCastingWeight > 0 && (
                <span className="text-zinc-400 font-normal ml-1">
                  — design: {expectedCastingWeight.toFixed(2)}g
                </span>
              )}
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={draft.metalWeightGrams}
              onChange={(e) =>
                setDraft((d) => ({ ...d, metalWeightGrams: e.target.value }))
              }
              onBlur={handleMetalWeightBlur}
              disabled={item.rawMaterialDeducted}
              className={inputClass}
            />
            {parsedMetalWeight !== null &&
              !weightsMatch(parsedMetalWeight, expectedCastingWeight) && (
                <textarea
                  value={metalWeightOverrideNote}
                  onChange={(e) => setMetalWeightOverrideNote(e.target.value)}
                  className={`${inputClass} min-h-[60px] text-xs mt-2`}
                  placeholder="Reason for weight difference…"
                />
              )}
          </div>
        </div>
      )}

      {needsStoneLot && canEdit && (
        <div>
          <label className={labelClass}>Stone lot</label>
          <select
            value={draft.stoneLotId}
            onChange={(e) => {
              setDraft((d) => ({ ...d, stoneLotId: e.target.value }));
              void saveField("stoneLotId", e.target.value || null);
            }}
            disabled={item.rawMaterialDeducted}
            className={inputClass}
          >
            <option value="">Select stone lot…</option>
            {stoneLots
              .filter((lot) => lot.status === "In Stock")
              .map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.certificateNumber} ({lot.carat}ct)
                </option>
              ))}
          </select>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={draft.castingReceived}
          onChange={(e) => {
            setDraft((d) => ({ ...d, castingReceived: e.target.checked }));
            void saveField("castingReceived", e.target.checked);
          }}
          disabled={!canEdit || item.rawMaterialDeducted}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Casting Received
      </label>

      {rowError && <p className="text-xs text-red-500">{rowError}</p>}
    </div>
  );
}

function StoneSettingFields({
  item,
  canEdit,
  onPatch,
}: {
  item: ProductionRunItem;
  canEdit: boolean;
  onPatch: (input: UpdateProductionRunItemInput) => Promise<void>;
}) {
  const [czStones, setCzStones] = useState(
    item.czStones !== undefined ? String(item.czStones) : "",
  );
  const [czWeight, setCzWeight] = useState(
    item.czWeight !== undefined ? String(item.czWeight) : "",
  );

  useEffect(() => {
    setCzStones(item.czStones !== undefined ? String(item.czStones) : "");
    setCzWeight(item.czWeight !== undefined ? String(item.czWeight) : "");
  }, [item.czStones, item.czWeight]);

  const handleBlur = (field: "czStones" | "czWeight") => {
    const raw = field === "czStones" ? czStones : czWeight;
    const current =
      item[field] !== undefined ? String(item[field]) : "";
    if (raw === current) return;
    const parsed =
      raw === "" ? null : field === "czWeight" ? parseFloat(raw) : parseInt(raw, 10);
    if (raw !== "" && (parsed === null || Number.isNaN(parsed))) return;
    void onPatch({ [field]: parsed });
  };

  return (
    <div className="surface-card p-4 space-y-3">
      <p className="font-medium text-zinc-900">{item.elementName}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>CZ Stones</label>
          <input
            type="number"
            min={0}
            value={czStones}
            onChange={(e) => setCzStones(e.target.value)}
            onBlur={() => handleBlur("czStones")}
            disabled={!canEdit}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>CZ Weight (ct)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={czWeight}
            onChange={(e) => setCzWeight(e.target.value)}
            onBlur={() => handleBlur("czWeight")}
            disabled={!canEdit}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProductionRunStagePage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.id as string;
  const stageSlug = params.stageSlug as string;
  const stage = slugToProductionRunStage(stageSlug);

  const { user } = useAuth();
  const canEditItems = user ? canUpdateProductionRunItems(user.role) : false;
  const canManage = user ? canManageProductionRuns(user.role) : false;
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
        router.push(`/production-runs/${runId}`);
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
    return loading ? <PageSkeleton /> : <p className="text-sm text-zinc-500">Invalid stage.</p>;
  }

  const isCurrent = isProductionRunStepCurrent(run.currentStage, stage);
  const completedStages = run.stageLogs.map((l) => l.stage);
  const isDone = completedStages.includes(stage);

  const waxItems = run.items.filter((i) => i.elementType === "Casting");
  const stoneItems = run.items.filter(
    (i) => i.elementType === "Stone" || i.elementType === "Motif",
  );

  const stepMeta = PRODUCTION_RUN_STEPS.find((s) => s.slug === stageSlug);

  return (
    <ProductionRunWizardShell run={run}>
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="surface-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">{stepMeta?.label}</h2>

        {stageSlug === "wax-pattern" && (
          <div className="space-y-3">
            {waxItems.length === 0 ? (
              <p className="text-sm text-zinc-500">No casting elements on this run.</p>
            ) : (
              waxItems.map((item) => (
                <WaxPatternFields
                  key={item.id}
                  item={item}
                  canEdit={canEditItems && isCurrent}
                  onPatch={(input) => patchItem(item.id, input)}
                />
              ))
            )}
          </div>
        )}

        {stageSlug === "casting" && (
          <div className="space-y-3">
            {run.items.map((item) => (
              <CastingFields
                key={item.id}
                item={item}
                canEdit={canEditItems && isCurrent}
                metalLots={metalLots}
                stoneLots={stoneLots}
                onPatch={(input) => patchItem(item.id, input)}
              />
            ))}
          </div>
        )}

        {stageSlug === "stone-setting" && (
          <div className="space-y-3">
            {stoneItems.length === 0 ? (
              <p className="text-sm text-zinc-500">No stone/motif elements on this run.</p>
            ) : (
              stoneItems.map((item) => (
                <StoneSettingFields
                  key={item.id}
                  item={item}
                  canEdit={canEditItems && isCurrent}
                  onPatch={(input) => patchItem(item.id, input)}
                />
              ))
            )}
          </div>
        )}

        {!["wax-pattern", "casting", "stone-setting"].includes(stageSlug) && (
          <p className="text-sm text-zinc-500">
            Confirm this stage is complete when ready. Add optional notes below.
          </p>
        )}

        {isCurrent && canEditItems && (
          <div>
            <label className={labelClass}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} min-h-[80px]`}
            />
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
