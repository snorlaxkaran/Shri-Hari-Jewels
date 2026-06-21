"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canManageProductionRuns,
  canUpdateProductionRunItems,
} from "@/lib/auth/permissions";
import { useProductionRuns } from "@/lib/production-runs/production-runs-context";
import {
  exportProductionRunCsv,
  fetchFinishedGoodsDefaults,
  fetchProductionRun,
} from "@/lib/api/production-runs";
import { fetchMetalLots, fetchStoneLots } from "@/lib/api/raw-inventory";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/inventory/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api/client";
import { stageToProductionRunSlug } from "@/lib/production-runs/stages";
import {
  expectedElementWeight,
  weightMismatchMessage,
  weightsMatch,
} from "@/lib/weight-reconciliation";
import { getCastingReceivedError } from "@/lib/production-runs/casting-validation";
import type {
  FinishedGoodsDefaults,
  FinishedGoodsInput,
  MetalLot,
  MetalType,
  ProductionRun,
  ProductionRunItem,
  ProductionRunStatus,
  Purity,
  StoneLot,
  UpdateProductionRunItemInput,
} from "@/lib/types";

const STATUSES: ProductionRunStatus[] = [
  "Open",
  "In Progress",
  "Completed",
  "Cancelled",
];

const METALS: MetalType[] = ["Gold", "Silver", "Platinum", "Rose Gold"];
const PURITIES: Purity[] = ["24K", "22K", "18K", "14K", "925"];

const inputClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

function RunItemCard({
  run,
  item,
  canEditItems,
  metalLots,
  stoneLots,
  onPatchItem,
}: {
  run: ProductionRun;
  item: ProductionRunItem;
  canEditItems: boolean;
  metalLots: MetalLot[];
  stoneLots: StoneLot[];
  onPatchItem: (
    runId: string,
    itemId: string,
    input: UpdateProductionRunItemInput,
  ) => Promise<ProductionRun>;
}) {
  const [draft, setDraft] = useState({
    productionDate: item.productionDate
      ? item.productionDate.slice(0, 10)
      : "",
    waxCount: item.waxCount !== undefined ? String(item.waxCount) : "",
    czStones: item.czStones !== undefined ? String(item.czStones) : "",
    czWeight: item.czWeight !== undefined ? String(item.czWeight) : "",
    metalWeightGrams:
      item.metalWeightGrams !== undefined ? String(item.metalWeightGrams) : "",
    metalLotId: item.metalLotId ?? "",
    stoneLotId: item.stoneLotId ?? "",
    castingReceived: item.castingReceived,
  });
  const [rowError, setRowError] = useState("");
  const [metalWeightOverrideNote, setMetalWeightOverrideNote] = useState("");
  const [confirmCastingOpen, setConfirmCastingOpen] = useState(false);
  const [castingSubmitting, setCastingSubmitting] = useState(false);

  const needsMetalLot = item.elementType === "Casting";
  const needsStoneLot =
    item.elementType === "Stone" || item.elementType === "Motif";

  const expectedCastingWeight = expectedElementWeight(
    item.weightGramsPerPc,
    item.qtyPerSet,
  );
  const parsedMetalWeight =
    draft.metalWeightGrams === "" ? null : parseFloat(draft.metalWeightGrams);
  const castingWeightMismatch =
    needsMetalLot &&
    parsedMetalWeight !== null &&
    !Number.isNaN(parsedMetalWeight) &&
    !weightsMatch(parsedMetalWeight, expectedCastingWeight);

  useEffect(() => {
    setDraft({
      productionDate: item.productionDate
        ? item.productionDate.slice(0, 10)
        : "",
      waxCount: item.waxCount !== undefined ? String(item.waxCount) : "",
      czStones: item.czStones !== undefined ? String(item.czStones) : "",
      czWeight: item.czWeight !== undefined ? String(item.czWeight) : "",
      metalWeightGrams:
        item.metalWeightGrams !== undefined ? String(item.metalWeightGrams) : "",
      metalLotId: item.metalLotId ?? "",
      stoneLotId: item.stoneLotId ?? "",
      castingReceived: item.castingReceived,
    });
  }, [item]);

  const saveField = async (
    field: keyof UpdateProductionRunItemInput,
    value: UpdateProductionRunItemInput[keyof UpdateProductionRunItemInput],
    extra?: Pick<UpdateProductionRunItemInput, "metalWeightOverrideNote">,
  ) => {
    setRowError("");
    try {
      await onPatchItem(run.id, item.id, { [field]: value, ...extra });
    } catch (err) {
      setRowError(getApiErrorMessage(err, "Failed to save item."));
    }
  };

  const handleMarkCastingReceived = async () => {
    const err = getCastingReceivedError(item, draft);
    if (err) {
      setRowError(err);
      setConfirmCastingOpen(false);
      return;
    }

    setCastingSubmitting(true);
    setRowError("");
    try {
      setDraft((d) => ({ ...d, castingReceived: true }));
      await saveField("castingReceived", true);
      setConfirmCastingOpen(false);
    } catch {
      setDraft((d) => ({ ...d, castingReceived: item.castingReceived }));
    } finally {
      setCastingSubmitting(false);
    }
  };

  const handleDateBlur = () => {
    const current = item.productionDate?.slice(0, 10) ?? "";
    if (draft.productionDate === current) return;
    void saveField(
      "productionDate",
      draft.productionDate ? draft.productionDate : null,
    );
  };

  const handleNumberBlur = (
    field: "waxCount" | "czStones" | "czWeight",
  ) => {
    const raw = draft[field];
    const current =
      item[field] !== undefined ? String(item[field]) : "";

    if (raw === current) return;

    const parsed =
      raw === "" ? null : field === "czWeight" ? parseFloat(raw) : parseInt(raw, 10);

    if (raw !== "" && (parsed === null || Number.isNaN(parsed))) {
      setDraft((d) => ({
        ...d,
        [field]: current,
      }));
      return;
    }

    void saveField(field, parsed);
  };

  const handleMetalWeightBlur = () => {
    const raw = draft.metalWeightGrams;
    const current =
      item.metalWeightGrams !== undefined ? String(item.metalWeightGrams) : "";
    if (raw === current) return;
    const parsed = raw === "" ? null : parseFloat(raw);
    if (raw !== "" && (parsed === null || Number.isNaN(parsed))) {
      setDraft((d) => ({ ...d, metalWeightGrams: current }));
      return;
    }

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

    setRowError("");
    void saveField("metalWeightGrams", parsed, {
      metalWeightOverrideNote: metalWeightOverrideNote.trim() || undefined,
    });
  };

  const handleLotChange = (
    field: "metalLotId" | "stoneLotId",
    value: string,
  ) => {
    setDraft((d) => ({ ...d, [field]: value }));
    void saveField(field, value || null);
  };

  return (
    <div className="surface-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-900">{item.elementName}</h3>
          <p className="text-sm text-zinc-500">{item.elementType}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-zinc-400 text-xs block">Qty / set</span>
            <span className="font-medium text-zinc-700">{item.qtyPerSet}</span>
          </div>
          <div>
            <span className="text-zinc-400 text-xs block">Total qty</span>
            <span className="font-medium text-zinc-700">{item.totalQty}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className={labelClass}>Production date</label>
          <input
            type="date"
            value={draft.productionDate}
            onChange={(e) =>
              setDraft((d) => ({ ...d, productionDate: e.target.value }))
            }
            onBlur={handleDateBlur}
            disabled={!canEditItems}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Wax Moulds</label>
          <input
            type="number"
            min={0}
            value={draft.waxCount}
            onChange={(e) =>
              setDraft((d) => ({ ...d, waxCount: e.target.value }))
            }
            onBlur={() => handleNumberBlur("waxCount")}
            disabled={!canEditItems}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>CZ Stones</label>
          <input
            type="number"
            min={0}
            value={draft.czStones}
            onChange={(e) =>
              setDraft((d) => ({ ...d, czStones: e.target.value }))
            }
            onBlur={() => handleNumberBlur("czStones")}
            disabled={!canEditItems}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>CZ Weight (ct)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={draft.czWeight}
            onChange={(e) =>
              setDraft((d) => ({ ...d, czWeight: e.target.value }))
            }
            onBlur={() => handleNumberBlur("czWeight")}
            disabled={!canEditItems}
            className={inputClass}
          />
        </div>
      </div>

      {needsMetalLot && canEditItems && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
          <div>
            <label className={labelClass}>Metal lot</label>
            <select
              value={draft.metalLotId}
              onChange={(e) => handleLotChange("metalLotId", e.target.value)}
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
            {castingWeightMismatch && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-amber-700">
                  Weight differs from design ({expectedCastingWeight.toFixed(2)}g).
                  Explain before saving.
                </p>
                <textarea
                  value={metalWeightOverrideNote}
                  onChange={(e) => setMetalWeightOverrideNote(e.target.value)}
                  className={`${inputClass} min-h-[60px] text-xs`}
                  placeholder="Reason for weight difference…"
                  disabled={item.rawMaterialDeducted}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {needsStoneLot && canEditItems && (
        <div className="pt-2 border-t border-zinc-100">
          <label className={labelClass}>Stone lot</label>
          <select
            value={draft.stoneLotId}
            onChange={(e) => handleLotChange("stoneLotId", e.target.value)}
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

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-100">
        {item.castingReceived || item.rawMaterialDeducted ? (
          <span className="text-sm text-emerald-700">
            Casting received
            {item.rawMaterialDeducted ? " · stock deducted from Raw Inventory" : ""}
          </span>
        ) : canEditItems ? (
          <>
            <button
              type="button"
              onClick={() => setConfirmCastingOpen(true)}
              className="btn-primary px-4 py-2 text-sm"
            >
              Mark casting received
            </button>
            <ConfirmDialog
              open={confirmCastingOpen}
              message={`Mark "${item.elementName}" as casting received? Stone stock is deducted now if applicable. Total metal for all sets is deducted when the run completes.`}
              onConfirm={() => void handleMarkCastingReceived()}
              onCancel={() => setConfirmCastingOpen(false)}
              loading={castingSubmitting}
            />
          </>
        ) : null}
      </div>

      {rowError && <p className="text-xs text-red-500">{rowError}</p>}
    </div>
  );
}

function CreateSkuSection({
  runId,
  defaults,
  loadingDefaults,
  defaultsError,
  onSubmit,
}: {
  runId: string;
  defaults: FinishedGoodsDefaults | null;
  loadingDefaults: boolean;
  defaultsError: string;
  onSubmit: (finishedGoods: FinishedGoodsInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Others");
  const [metal, setMetal] = useState<MetalType>("Gold");
  const [purity, setPurity] = useState<Purity>("22K");
  const [weightGrams, setWeightGrams] = useState("");
  const [makingCharges, setMakingCharges] = useState("");
  const [stoneCarat, setStoneCarat] = useState("");
  const [price, setPrice] = useState("");
  const [weightOverrideNote, setWeightOverrideNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!defaults) return;
    setName(defaults.name);
    setCategory(defaults.category as ProductCategory);
    setMetal(defaults.metal);
    setPurity(defaults.purity);
    setWeightGrams(String(defaults.weightGrams ?? 0));
    setMakingCharges(String(defaults.makingCharges ?? 0));
    setStoneCarat(
      defaults.stoneCarat !== undefined ? String(defaults.stoneCarat) : "",
    );
    setPrice(defaults.price !== undefined ? String(defaults.price) : "0");
    setWeightOverrideNote("");
    setError("");
  }, [defaults, runId]);

  const breakdown = defaults?.priceBreakdown;
  const weightNum = parseFloat(weightGrams);
  const expectedSkuWeight = defaults?.weightGrams ?? 0;
  const skuWeightMismatch =
    defaults !== null &&
    !Number.isNaN(weightNum) &&
    !weightsMatch(weightNum, expectedSkuWeight);
  const showWeightWarning =
    defaults !== null && !Number.isNaN(weightNum) && weightNum === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const weight = parseFloat(weightGrams);
    const charges = parseFloat(makingCharges);
    const listPrice = parseFloat(price);
    const carat = stoneCarat === "" ? undefined : parseFloat(stoneCarat);

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (Number.isNaN(weight) || weight < 0) {
      setError("Weight cannot be negative.");
      return;
    }
    if (
      defaults &&
      !weightsMatch(weight, defaults.weightGrams) &&
      !weightOverrideNote.trim()
    ) {
      setError(
        weightMismatchMessage(weight, defaults.weightGrams, "SKU weight"),
      );
      return;
    }
    if (Number.isNaN(charges) || charges < 0) {
      setError("Making charges cannot be negative.");
      return;
    }
    if (price === "" || Number.isNaN(listPrice)) {
      setError("List price is required.");
      return;
    }
    if (listPrice < 0) {
      setError("Price cannot be negative.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        category,
        metal,
        purity,
        weightGrams: weight,
        makingCharges: charges,
        stoneCarat: carat,
        price: listPrice,
        images: [],
        weightOverrideNote: weightOverrideNote.trim() || undefined,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create SKU."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDefaults) {
    return (
      <div className="surface-card p-5 text-sm text-zinc-500">
        Loading SKU defaults…
      </div>
    );
  }

  if (defaultsError) {
    return (
      <div className="surface-card p-5 text-sm text-red-500">{defaultsError}</div>
    );
  }

  if (!defaults) return null;

  return (
    <div className="surface-card p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">
          Create SKU & add to inventory
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Complete this run by creating a finished-goods product in inventory.
        </p>
      </div>

      {breakdown && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 space-y-2">
          <p className="text-xs font-medium text-emerald-800">
            Auto-calculated from design BOM & metal rates
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-emerald-900">
            <span>
              Metal ({breakdown.weightGrams}g ×{" "}
              {formatCurrency(breakdown.metalRatePerGram)}/g)
            </span>
            <span className="text-right">
              {formatCurrency(breakdown.metalValue)}
            </span>
            {breakdown.components.map((component) => (
              <div key={component.name} className="contents">
                <span>
                  {component.name} ({component.qtyPerSet} ×{" "}
                  {formatCurrency(component.unitValue)})
                </span>
                <span className="text-right">
                  {formatCurrency(component.lineValue)}
                </span>
              </div>
            ))}
            <span>Making charges</span>
            <span className="text-right">
              {formatCurrency(breakdown.makingCharges)}
            </span>
            <span className="font-semibold pt-1 border-t border-emerald-200">
              List price
            </span>
            <span className="font-semibold text-right pt-1 border-t border-emerald-200">
              {formatCurrency(breakdown.totalPrice)}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>SKU (from design)</label>
          <input
            value={defaults.sku || defaults.designCode}
            readOnly
            className={`${inputClass} bg-zinc-50 text-zinc-700`}
          />
        </div>

        <div>
          <label className={labelClass}>Product name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              className={inputClass}
            >
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Metal *</label>
            <select
              value={metal}
              onChange={(e) => setMetal(e.target.value as MetalType)}
              className={inputClass}
            >
              {METALS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Purity *</label>
            <select
              value={purity}
              onChange={(e) => setPurity(e.target.value as Purity)}
              className={inputClass}
            >
              {PURITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Weight (g)
              {expectedSkuWeight > 0 && (
                <span className="text-zinc-400 font-normal ml-1">
                  — from run: {expectedSkuWeight.toFixed(2)}g
                </span>
              )}
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={weightGrams}
              onChange={(e) => setWeightGrams(e.target.value)}
              className={inputClass}
            />
            {showWeightWarning && (
              <p className="text-xs text-amber-600 mt-1">
                No metal weight recorded on casting items yet. Enter weight on
                items above or set it manually here.
              </p>
            )}
            {skuWeightMismatch && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-amber-700">
                  Weight differs from validated run total. Explain to continue.
                </p>
                <textarea
                  value={weightOverrideNote}
                  onChange={(e) => setWeightOverrideNote(e.target.value)}
                  className={`${inputClass} min-h-[60px] text-xs`}
                  placeholder="Reason for weight difference…"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Making charges</label>
            <input
              type="number"
              min={0}
              value={makingCharges}
              onChange={(e) => setMakingCharges(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Stone carat</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={stoneCarat}
              onChange={(e) => setStoneCarat(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>List price (INR) *</label>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
          <p className="text-[11px] text-zinc-400 mt-1">
            Pre-filled from BOM when available. You can override manually.
          </p>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary px-6 py-2.5 text-sm"
        >
          {submitting ? "Saving…" : "Save & Create SKU"}
        </button>
      </form>
    </div>
  );
}

export default function ProductionRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.id as string;

  const { user } = useAuth();
  const canManage = user ? canManageProductionRuns(user.role) : false;
  const canEditItems = user ? canUpdateProductionRunItems(user.role) : false;

  const { patchProductionRun, patchProductionRunItem, removeProductionRun } =
    useProductionRuns();

  const [run, setRun] = useState<ProductionRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [metalLots, setMetalLots] = useState<MetalLot[]>([]);
  const [stoneLots, setStoneLots] = useState<StoneLot[]>([]);
  const [exporting, setExporting] = useState(false);

  const [statusDraft, setStatusDraft] = useState<ProductionRunStatus | null>(
    null,
  );
  const [showCreateSku, setShowCreateSku] = useState(false);
  const [skuDefaults, setSkuDefaults] = useState<FinishedGoodsDefaults | null>(
    null,
  );
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [defaultsError, setDefaultsError] = useState("");

  const loadRun = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      const data = await fetchProductionRun(runId);
      setRun(data);
      setStatusDraft(null);
      setShowCreateSku(false);
      setSkuDefaults(null);
    } catch (err) {
      setPageError(getApiErrorMessage(err, "Failed to load production run."));
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void loadRun();
  }, [loadRun]);

  useEffect(() => {
    if (!run) return;
    if (run.status === "Completed" || run.status === "Cancelled") return;
    const slug = stageToProductionRunSlug(run.currentStage);
    if (slug) router.replace(`/production-runs/${runId}/${slug}`);
  }, [run, runId, router]);

  useEffect(() => {
    if (!canEditItems) return;
    void Promise.all([fetchMetalLots(), fetchStoneLots()])
      .then(([metal, stone]) => {
        setMetalLots(metal);
        setStoneLots(stone);
      })
      .catch(() => {
        // Lot lists are optional until user edits items
      });
  }, [canEditItems]);

  const displayStatus = statusDraft ?? run?.status;

  const loadSkuDefaults = useCallback(async () => {
    setLoadingDefaults(true);
    setDefaultsError("");
    try {
      const defaults = await fetchFinishedGoodsDefaults(runId);
      setSkuDefaults(defaults);
    } catch (err) {
      setDefaultsError(
        getApiErrorMessage(err, "Failed to load SKU defaults."),
      );
    } finally {
      setLoadingDefaults(false);
    }
  }, [runId]);

  const handleStatusChange = async (status: ProductionRunStatus) => {
    if (!run) return;
    setStatusError("");

    if (status === run.status) {
      setStatusDraft(null);
      setShowCreateSku(false);
      setSkuDefaults(null);
      return;
    }

    if (status === "Completed" && !run.finishedGoodsProductId) {
      setStatusDraft(null);
      setShowCreateSku(false);
      setSkuDefaults(null);

      try {
        const updated = await patchProductionRun(run.id, { status });
        setRun(updated);
      } catch (err) {
        setStatusError(getApiErrorMessage(err, "Failed to update status."));
      }
      return;
    }

    setStatusDraft(null);
    setShowCreateSku(false);
    setSkuDefaults(null);

    try {
      const updated = await patchProductionRun(run.id, { status });
      setRun(updated);
    } catch (err) {
      setStatusError(getApiErrorMessage(err, "Failed to update status."));
    }
  };

  const handleCreateSku = async (finishedGoods: FinishedGoodsInput) => {
    if (!run) return;
    const updated = await patchProductionRun(run.id, {
      status: "Completed",
      createFinishedGoods: true,
      finishedGoods,
    });
    setRun(updated);
    setStatusDraft(null);
    setShowCreateSku(false);
    setSkuDefaults(null);
    router.push(`/designs?design=${run.designId}`);
  };

  const handlePatchItem = async (
    id: string,
    itemId: string,
    input: UpdateProductionRunItemInput,
  ) => {
    const updated = await patchProductionRunItem(id, itemId, input);
    setRun(updated);
    return updated;
  };

  const handleExport = async () => {
    if (!run) return;
    setExporting(true);
    try {
      await exportProductionRunCsv(run.id, run.runNo);
    } catch (err) {
      setPageError(getApiErrorMessage(err, "Failed to export CSV."));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!run) return;
    if (
      !window.confirm(
        `Delete production run ${run.runNo}? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await removeProductionRun(run.id);
      router.push("/production-runs");
    } catch (err) {
      setPageError(getApiErrorMessage(err, "Failed to delete run."));
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!run) {
    return (
      <div className="space-y-4">
        <Link
          href="/production-runs"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft size={16} />
          Back to production runs
        </Link>
        <div className="surface-card px-5 py-8 text-center text-sm text-red-500">
          {pageError || "Production run not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/production-runs"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft size={16} />
        Back to production runs
      </Link>

      {pageError && (
        <div className="px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {pageError}
        </div>
      )}

      <div className="surface-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-400 mb-1">Run {run.runNo}</p>
            <h1 className="text-xl font-semibold text-zinc-900">
              {run.designCode}
              {run.designName ? ` — ${run.designName}` : ""}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {run.setsOrdered} set{run.setsOrdered !== 1 ? "s" : ""} ordered ·
              Created {formatDate(run.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManage ? (
              <select
                value={displayStatus}
                onChange={(e) =>
                  void handleStatusChange(e.target.value as ProductionRunStatus)
                }
                className="input-field text-sm py-2 px-3"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                {run.status}
              </span>
            )}

            {run.finishedGoodsProductId && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                In inventory
              </span>
            )}

            <button
              onClick={() => void handleExport()}
              disabled={exporting}
              className="btn-secondary px-3 py-2 text-xs flex items-center gap-1"
            >
              <Download size={14} />
              {exporting ? "Exporting…" : "CSV"}
            </button>

            {canManage && (
              <button
                onClick={() => void handleDelete()}
                className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50"
                title="Delete run"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {statusError && (
          <p className="text-xs text-red-500 mt-3">{statusError}</p>
        )}
      </div>

      <div className="space-y-4">
        {run.items.map((item) => (
          <RunItemCard
            key={item.id}
            run={run}
            item={item}
            canEditItems={canEditItems}
            metalLots={metalLots}
            stoneLots={stoneLots}
            onPatchItem={handlePatchItem}
          />
        ))}
      </div>

      {showCreateSku && !run.finishedGoodsProductId && (
        <CreateSkuSection
          runId={run.id}
          defaults={skuDefaults}
          loadingDefaults={loadingDefaults}
          defaultsError={defaultsError}
          onSubmit={handleCreateSku}
        />
      )}
    </div>
  );
}
