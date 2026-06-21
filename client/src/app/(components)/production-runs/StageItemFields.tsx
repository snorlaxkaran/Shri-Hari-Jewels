"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import type {
  MetalLot,
  ProductionRunItem,
  ProductionRunStage,
  StoneLot,
  UpdateProductionRunItemInput,
} from "@/lib/types";
import {
  expectedElementWeight,
  weightMismatchMessage,
  weightsMatch,
} from "@/lib/weight-reconciliation";
import { getCastingReceivedError } from "@/lib/production-runs/casting-validation";
import { getApiErrorMessage } from "@/lib/api/client";
import { isItemStageDone } from "@/lib/production-runs/item-helpers";

const inputClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type PatchHandler = (input: UpdateProductionRunItemInput) => Promise<void>;

export function WaxPatternFields({
  item,
  canEdit,
  onPatch,
}: {
  item: ProductionRunItem;
  canEdit: boolean;
  onPatch: PatchHandler;
}) {
  const [waxCount, setWaxCount] = useState(
    item.waxCount !== undefined ? String(item.waxCount) : "",
  );
  const [productionDate, setProductionDate] = useState(
    item.productionDate ? item.productionDate.slice(0, 10) : "",
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setWaxCount(item.waxCount !== undefined ? String(item.waxCount) : "");
    setProductionDate(item.productionDate ? item.productionDate.slice(0, 10) : "");
  }, [item.waxCount, item.productionDate]);

  const persist = async (input: UpdateProductionRunItemInput) => {
    setSaveState("saving");
    setSaveError("");
    try {
      await onPatch(input);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1500);
    } catch (err) {
      setSaveState("error");
      setSaveError(getApiErrorMessage(err, "Failed to save."));
    }
  };

  const saveWaxCount = () => {
    const current = item.waxCount !== undefined ? String(item.waxCount) : "";
    if (waxCount === current) return;
    const parsed = waxCount === "" ? null : parseInt(waxCount, 10);
    if (waxCount !== "" && (parsed === null || Number.isNaN(parsed))) return;
    void persist({ waxCount: parsed });
  };

  const saveProductionDate = () => {
    const current = item.productionDate?.slice(0, 10) ?? "";
    if (productionDate === current) return;
    void persist({ productionDate: productionDate || null });
  };

  return (
    <div className="space-y-3">
      {!canEdit && (
        <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1.5 rounded">
          Read-only — open the current active step to edit this worksheet.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Wax moulds</label>
          <input
            type="number"
            min={0}
            value={waxCount}
            onChange={(e) => setWaxCount(e.target.value)}
            onBlur={saveWaxCount}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            disabled={!canEdit}
            className={inputClass}
            placeholder="Enter count"
          />
        </div>
        <div>
          <label className={labelClass}>Production date</label>
          <input
            type="date"
            value={productionDate}
            onChange={(e) => setProductionDate(e.target.value)}
            onBlur={saveProductionDate}
            disabled={!canEdit}
            className={inputClass}
          />
        </div>
      </div>
      {saveState === "saving" && (
        <p className="text-xs text-zinc-500">Saving…</p>
      )}
      {saveState === "saved" && (
        <p className="text-xs text-emerald-600">Saved</p>
      )}
      {saveError && <p className="text-xs text-red-500">{saveError}</p>}
    </div>
  );
}

export function CastingFields({
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
  onPatch: PatchHandler;
}) {
  const isCastingElement = item.elementType === "Casting";
  const needsMetalLot = isCastingElement;
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
  const [rowSuccess, setRowSuccess] = useState("");
  const [confirmCastingOpen, setConfirmCastingOpen] = useState(false);
  const [castingSubmitting, setCastingSubmitting] = useState(false);

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

  const handleMarkCastingReceived = async () => {
    const err = getCastingReceivedError(item, {
      ...draft,
      czWeight: item.czWeight !== undefined ? String(item.czWeight) : "",
    });
    if (err) {
      setRowError(err);
      setConfirmCastingOpen(false);
      return;
    }

    setCastingSubmitting(true);
    setRowError("");
    setRowSuccess("");
    try {
      await onPatch({ castingReceived: true });
      setDraft((d) => ({ ...d, castingReceived: true }));
      setRowSuccess(
        "Casting received. Raw metal/stone deducted from Raw Inventory. Finished jewellery SKU is added to Inventory when the full run is completed.",
      );
      setConfirmCastingOpen(false);
    } catch (patchErr) {
      setRowError(getApiErrorMessage(patchErr, "Failed to mark casting received."));
      setConfirmCastingOpen(false);
    } finally {
      setCastingSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {needsMetalLot && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Metal lot</label>
            <select
              value={draft.metalLotId}
              onChange={(e) => {
                setDraft((d) => ({ ...d, metalLotId: e.target.value }));
                void saveField("metalLotId", e.target.value || null);
              }}
              disabled={!canEdit || item.rawMaterialDeducted}
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
              disabled={!canEdit || item.rawMaterialDeducted}
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

      {needsStoneLot && (
        <div>
          <label className={labelClass}>Stone lot</label>
          <select
            value={draft.stoneLotId}
            onChange={(e) => {
              setDraft((d) => ({ ...d, stoneLotId: e.target.value }));
              void saveField("stoneLotId", e.target.value || null);
            }}
            disabled={!canEdit || item.rawMaterialDeducted}
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

      {isCastingElement && (
        <div className="space-y-2">
          {item.castingReceived || item.rawMaterialDeducted ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Casting received
              {item.rawMaterialDeducted ? " · raw stock deducted" : ""}
            </div>
          ) : canEdit ? (
            <button
              type="button"
              onClick={() => setConfirmCastingOpen(true)}
              className="btn-primary px-4 py-2 text-sm"
            >
              Mark casting received
            </button>
          ) : (
            <p className="text-xs text-zinc-400">Casting not yet received.</p>
          )}
          <ConfirmDialog
            open={confirmCastingOpen}
            message={`Mark "${item.elementName}" as casting received? This deducts metal/stone from Raw Inventory.`}
            onConfirm={() => void handleMarkCastingReceived()}
            onCancel={() => setConfirmCastingOpen(false)}
            loading={castingSubmitting}
          />
        </div>
      )}

      {!isCastingElement && !needsStoneLot && (
        <p className="text-xs text-zinc-400">
          No casting input required for this element.
        </p>
      )}

      {rowError && <p className="text-xs text-red-500">{rowError}</p>}
      {rowSuccess && <p className="text-xs text-emerald-700">{rowSuccess}</p>}
    </div>
  );
}

export function StoneSettingFields({
  item,
  canEdit,
  onPatch,
}: {
  item: ProductionRunItem;
  canEdit: boolean;
  onPatch: PatchHandler;
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
    const current = item[field] !== undefined ? String(item[field]) : "";
    if (raw === current) return;
    const parsed =
      raw === "" ? null : field === "czWeight" ? parseFloat(raw) : parseInt(raw, 10);
    if (raw !== "" && (parsed === null || Number.isNaN(parsed))) return;
    void onPatch({ [field]: parsed });
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelClass}>CZ stones</label>
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
        <label className={labelClass}>CZ weight (ct)</label>
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
  );
}

export function StageCheckoffField({
  item,
  stage,
  checkoffStage,
  canEdit,
  onPatch,
}: {
  item: ProductionRunItem;
  stage: ProductionRunStage;
  checkoffStage: ProductionRunStage;
  canEdit: boolean;
  onPatch: PatchHandler;
}) {
  const [rowError, setRowError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const done = isItemStageDone(item, checkoffStage);

  const handleConfirm = async () => {
    setSubmitting(true);
    setRowError("");
    try {
      await onPatch({
        stageCheckoffs: {
          ...(item.stageCheckoffs ?? {}),
          [checkoffStage]: true,
        },
      });
      setConfirmOpen(false);
    } catch (err) {
      setRowError(getApiErrorMessage(err, "Failed to save."));
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      {done ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Complete for {stage}
        </div>
      ) : canEdit ? (
        <>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Mark complete for {stage}
          </button>
          <ConfirmDialog
            open={confirmOpen}
            message={`Mark "${item.elementName}" complete for ${stage}?`}
            onConfirm={() => void handleConfirm()}
            onCancel={() => setConfirmOpen(false)}
            loading={submitting}
          />
        </>
      ) : (
        <p className="text-xs text-zinc-400">Not yet complete for {stage}.</p>
      )}
      {rowError && <p className="text-xs text-red-500">{rowError}</p>}
    </div>
  );
}
