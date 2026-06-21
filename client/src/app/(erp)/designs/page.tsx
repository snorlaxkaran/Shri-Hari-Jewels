"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import MotifCard from "@/app/(components)/designs/MotifCard";
import AddMotifCard from "@/app/(components)/designs/AddMotifCard";
import SkuDesignList from "@/app/(components)/designs/SkuDesignList";
import BomDiffModal from "@/app/(components)/designs/BomDiffModal";
import DesignBomImport from "@/app/(components)/designs/DesignBomImport";
import DesignPriceDriftPanel from "@/app/(components)/designs/DesignPriceDriftPanel";
import DesignHistoryPanel from "@/app/(components)/designs/DesignHistoryPanel";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageDesigns } from "@/lib/auth/permissions";
import { useDesigns } from "@/lib/designs/designs-context";
import { fetchMotifs } from "@/lib/api/motifs";
import {
  computeDesignElementDiff,
  replaceDesignElements,
} from "@/lib/api/designs";
import { designMetalToMotifMetal } from "@/lib/motifs/constants";
import type {
  Design,
  DesignCategory,
  DesignElementDiff,
  DesignElementType,
  MetalType,
  Motif,
  NewDesignElementInput,
  NewProductionRunInput,
  Purity,
} from "@/lib/types";
import { createProductionRun } from "@/lib/api/production-runs";
import { getApiErrorMessage } from "@/lib/api/client";

const AddDesignModal = dynamic(
  () => import("@/app/(components)/AddDesignModal"),
  { ssr: false },
);

const AddMotifModal = dynamic(
  () => import("@/app/(components)/designs/AddMotifModal"),
  { ssr: false },
);

const AddProductionRunModal = dynamic(
  () => import("@/app/(components)/AddProductionRunModal"),
  { ssr: false },
);

const CATEGORIES: DesignCategory[] = [
  "Necklace",
  "Earring",
  "Ring",
  "Bracelet",
  "Pendant",
  "Bangle",
  "Other",
];

const METALS: MetalType[] = ["Gold", "Silver", "Platinum", "Rose Gold"];
const PURITIES: Purity[] = ["24K", "22K", "18K", "14K", "925"];

const inputClass = "input-field w-full px-3 py-2 text-sm";

type LibraryElement = {
  key: string;
  name: string;
  type: DesignElementType;
  unitValue?: number;
  weightGramsPerPc?: number;
  qtyPerSet?: number;
};

function elementKey(type: DesignElementType, name: string) {
  return `${type}::${name}`;
}

function buildLibrary(designs: Design[]): LibraryElement[] {
  const map = new Map<string, LibraryElement>();
  for (const design of designs) {
    for (const el of design.elements) {
      const key = elementKey(el.type, el.name);
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: el.name,
          type: el.type,
          unitValue: el.unitValue,
          weightGramsPerPc: el.weightGramsPerPc,
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function estimatePrice(
  elements: LibraryElement[],
  makingCharges?: number,
): number {
  const component = elements.reduce((sum, el) => {
    const qty = el.qtyPerSet ?? 1;
    if (el.type === "Casting") {
      const wt = el.weightGramsPerPc ?? 0;
      return sum + wt * 5000 * qty;
    }
    return sum + (el.unitValue ?? 0) * qty;
  }, 0);
  return component + (makingCharges ?? 0);
}

export default function DesignsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canManage = user ? canManageDesigns(user.role) : false;
  const {
    designs,
    hydrated,
    loading,
    error,
    addDesign,
    patchDesign,
    removeDesign,
    addElement,
    refresh,
  } = useDesigns();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [motifModalOpen, setMotifModalOpen] = useState(false);
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [motifsLoading, setMotifsLoading] = useState(true);
  const [motifsError, setMotifsError] = useState<string | null>(null);
  const [motifSearch, setMotifSearch] = useState("");
  const [motifQuantities, setMotifQuantities] = useState<Record<string, number>>({});
  const [stonePick, setStonePick] = useState<Record<string, string>>({});
  const [castingPick, setCastingPick] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<DesignCategory | "">("");
  const [metal, setMetal] = useState<MetalType | "">("");
  const [purity, setPurity] = useState<Purity | "">("");
  const [makingCharges, setMakingCharges] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [productionRunModalOpen, setProductionRunModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [bomDiffOpen, setBomDiffOpen] = useState(false);
  const [bomDiff, setBomDiff] = useState<DesignElementDiff | null>(null);

  const library = useMemo(() => buildLibrary(designs), [designs]);

  const loadMotifs = useCallback(async () => {
    setMotifsLoading(true);
    setMotifsError(null);
    try {
      setMotifs(await fetchMotifs());
    } catch (err) {
      setMotifsError(getApiErrorMessage(err, "Could not load motif library."));
    } finally {
      setMotifsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMotifs();
  }, [loadMotifs]);

  const motifById = useMemo(() => {
    const map = new Map<string, Motif>();
    for (const motif of motifs) {
      map.set(motif.id, motif);
    }
    return map;
  }, [motifs]);

  const motifMetalFilter = designMetalToMotifMetal(metal);

  const filteredMotifs = useMemo(() => {
    if (!metal || !purity) return [];
    const q = motifSearch.trim().toLowerCase();
    return motifs.filter((m) => {
      if (motifMetalFilter && m.metal !== motifMetalFilter) return false;
      if (m.purity !== purity) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.metal.toLowerCase().includes(q) ||
        m.purity.toLowerCase().includes(q) ||
        m.subCategory.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
      );
    });
  }, [motifs, motifSearch, metal, purity, motifMetalFilter]);

  const selectedMotifCount = useMemo(
    () => Object.values(motifQuantities).filter((q) => q > 0).length,
    [motifQuantities],
  );

  const totalMotifPieces = useMemo(
    () => Object.values(motifQuantities).reduce((sum, q) => sum + q, 0),
    [motifQuantities],
  );

  const selectedDesign = useMemo(
    () => designs.find((d) => d.id === selectedId) ?? null,
    [designs, selectedId],
  );

  const syncFromDesign = useCallback(
    (design: Design) => {
      const quantities: Record<string, number> = {};
      const filterMetal = designMetalToMotifMetal(design.metal ?? "");
      design.elements
        .filter((e) => e.type === "Motif")
        .forEach((m) => {
          if (m.motifId) {
            quantities[m.motifId] = m.qtyPerSet;
            return;
          }
          const match = motifs.find(
            (motif) =>
              motif.name === m.name &&
              (!filterMetal || motif.metal === filterMetal) &&
              (!design.purity || motif.purity === design.purity),
          );
          if (match) {
            quantities[match.id] = m.qtyPerSet;
          }
        });
      setMotifQuantities(quantities);

    const stones: Record<string, string> = {};
    design.elements
      .filter((e) => e.type === "Stone")
      .forEach((e) => {
        stones[e.id] = elementKey(e.type, e.name);
      });
    setStonePick(stones);

    const castings: Record<string, string> = {};
    design.elements
      .filter((e) => e.type === "Casting")
      .forEach((e) => {
        castings[e.id] = elementKey(e.type, e.name);
      });
    setCastingPick(castings);

    setCategory(design.category ?? "");
    setMetal(design.metal ?? "");
    setPurity(design.purity ?? "");
    setMakingCharges(
      design.makingChargesPerSet != null
        ? String(design.makingChargesPerSet)
        : "",
    );
    setSaveError("");
  }, [motifs]);

  useEffect(() => {
    if (selectedDesign) syncFromDesign(selectedDesign);
  }, [selectedDesign, syncFromDesign]);

  useEffect(() => {
    const designId = searchParams.get("design");
    if (!designId || !hydrated) return;
    if (designs.some((design) => design.id === designId)) {
      setSelectedId(designId);
    }
  }, [searchParams, designs, hydrated]);

  const stoneElements = useMemo(() => {
    if (!selectedDesign) return [];
    return selectedDesign.elements.filter((e) => e.type === "Stone");
  }, [selectedDesign]);

  const castingElements = useMemo(() => {
    if (!selectedDesign) return [];
    return selectedDesign.elements.filter((e) => e.type === "Casting");
  }, [selectedDesign]);

  const stoneOptions = useMemo(
    () => library.filter((el) => el.type === "Stone"),
    [library],
  );

  const castingOptions = useMemo(
    () => library.filter((el) => el.type === "Casting"),
    [library],
  );

  const previewElements = useMemo((): LibraryElement[] => {
    const items: LibraryElement[] = [];

    for (const [motifId, qty] of Object.entries(motifQuantities)) {
      if (qty < 1) continue;
      const motif = motifById.get(motifId);
      if (motif) {
        items.push({
          key: motifId,
          name: motif.name,
          type: "Motif",
          unitValue: motif.price,
          weightGramsPerPc: motif.weightGrams,
          qtyPerSet: qty,
        });
        continue;
      }
      const el = library.find((l) => l.key === motifId);
      if (el) items.push({ ...el, qtyPerSet: qty });
    }
    for (const key of Object.values(stonePick)) {
      const el = library.find((l) => l.key === key);
      if (el) items.push({ ...el, qtyPerSet: 1 });
    }
    for (const key of Object.values(castingPick)) {
      const el = library.find((l) => l.key === key);
      if (el) items.push({ ...el, qtyPerSet: 1 });
    }
    return items;
  }, [
    library,
    motifQuantities,
    motifById,
    stonePick,
    castingPick,
  ]);

  const totalComponentPieces = useMemo(
    () =>
      previewElements.reduce((sum, el) => sum + (el.qtyPerSet ?? 1), 0),
    [previewElements],
  );

  const parsedMaking = makingCharges.trim()
    ? parseFloat(makingCharges)
    : undefined;
  const estimatedPrice = estimatePrice(
    previewElements,
    parsedMaking,
  );

  const handleSelectDesign = (design: Design) => {
    setSelectedId(design.id);
  };

  const calculatedDesignWeight = useMemo(
    () =>
      previewElements.reduce(
        (sum, el) =>
          sum + (el.weightGramsPerPc ?? 0) * (el.qtyPerSet ?? 1),
        0,
      ),
    [previewElements],
  );

  const setMotifQuantity = (motifId: string, qty: number) => {
    if (!canManage) return;
    const nextQty = Math.max(0, Math.floor(qty));
    setMotifQuantities((prev) => {
      const next = { ...prev };
      if (nextQty === 0) delete next[motifId];
      else next[motifId] = nextQty;
      return next;
    });
  };

  const buildTargetElements = (): NewDesignElementInput[] => {
    const result: NewDesignElementInput[] = [];

    for (const [motifId, qty] of Object.entries(motifQuantities)) {
      if (qty < 1) continue;
      const motif = motifById.get(motifId);
      if (motif) {
        result.push({
          name: motif.name,
          type: "Motif",
          motifId: motif.id,
          qtyPerSet: qty,
          unitValue: motif.price,
          weightGramsPerPc: motif.weightGrams,
        });
        continue;
      }
      const el = library.find((l) => l.key === motifId);
      if (el) {
        result.push({
          name: el.name,
          type: "Motif",
          qtyPerSet: qty,
          unitValue: el.unitValue,
          weightGramsPerPc: el.weightGramsPerPc,
        });
      }
    }
    for (const key of Object.values(stonePick)) {
      const el = library.find((l) => l.key === key);
      if (el) {
        result.push({
          name: el.name,
          type: "Stone",
          qtyPerSet: 1,
          unitValue: el.unitValue,
        });
      }
    }
    for (const key of Object.values(castingPick)) {
      const el = library.find((l) => l.key === key);
      if (el) {
        result.push({
          name: el.name,
          type: "Casting",
          qtyPerSet: 1,
          weightGramsPerPc: el.weightGramsPerPc,
        });
      }
    }
    return result;
  };

  const applySaveJewelry = async (): Promise<boolean> => {
    if (!selectedDesign || !canManage) return false;

    try {
      const making =
        makingCharges.trim() === ""
          ? null
          : parseFloat(makingCharges);
      if (making != null && (Number.isNaN(making) || making < 0)) {
        setSaveError("Invalid making charges.");
        return false;
      }

      await patchDesign(selectedDesign.id, {
        category: category || null,
        metal: metal || null,
        purity: purity || null,
        makingChargesPerSet: making,
      });

      const target = buildTargetElements();
      await replaceDesignElements(
        selectedDesign.id,
        target,
        "Manual BOM edit",
      );
      await refresh();
      return true;
    } catch (err) {
      setSaveError(getApiErrorMessage(err, "Failed to save jewelry."));
      return false;
    }
  };

  const handleSaveJewelry = async (): Promise<boolean> => {
    if (!selectedDesign || !canManage) return false;
    setSaveError("");

    const target = buildTargetElements();
    if (target.length === 0) {
      setSaveError("Add at least one motif or component before saving.");
      return false;
    }

    setSaving(true);
    try {
      const diff = await computeDesignElementDiff(selectedDesign.id, target);
      const hasElementChanges =
        diff.added.length > 0 ||
        diff.removed.length > 0 ||
        diff.changed.length > 0;

      if (hasElementChanges && selectedDesign.elements.length > 0) {
        setBomDiff(diff);
        setBomDiffOpen(true);
        return false;
      }

      return await applySaveJewelry();
    } catch (err) {
      setSaveError(getApiErrorMessage(err, "Failed to save jewelry."));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmBomDiff = async () => {
    setSaving(true);
    try {
      const ok = await applySaveJewelry();
      if (ok) {
        setBomDiffOpen(false);
        setBomDiff(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSendToProduction = async () => {
    if (!selectedDesign || !canManage) return;
    if (!metal) {
      setSaveError("Select a metal before sending to production.");
      return;
    }
    if (!purity) {
      setSaveError("Select a purity before sending to production.");
      return;
    }
    const saved = await handleSaveJewelry();
    if (saved) {
      setProductionRunModalOpen(true);
    }
  };

  const handleCreateProductionRun = async (input: NewProductionRunInput) => {
    const run = await createProductionRun(input);
    let message = `Production run ${run.runNo} created`;
    if (run.stoneStockWarnings?.length) {
      const summary = run.stoneStockWarnings
        .map(
          (w) =>
            `${w.sizeLabel}: need ${w.required}, have ${w.available}`,
        )
        .join("; ");
      message += `. Stone stock warning: ${summary}`;
    }
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 8000);
  };

  const handleCreateDesign = async (input: {
    code: string;
    name?: string;
    category?: DesignCategory;
  }) => {
    const design = await addDesign(input);
    setSelectedId(design.id);
    setModalOpen(false);
  };

  const handleAddMotif = async (input: {
    name: string;
    type: DesignElementType;
    unitValue?: number;
    weightGramsPerPc?: number;
    libraryMotifId?: string;
  }) => {
    if (!selectedDesign) return;
    await addElement(selectedDesign.id, {
      name: input.name,
      type: input.type,
      motifId: input.libraryMotifId,
      qtyPerSet: 1,
      unitValue: input.unitValue,
      weightGramsPerPc: input.weightGramsPerPc,
    });
    if (input.type === "Motif" && input.libraryMotifId) {
      setMotifQuantities((prev) => ({
        ...prev,
        [input.libraryMotifId!]: prev[input.libraryMotifId!]
          ? prev[input.libraryMotifId!] + 1
          : 1,
      }));
      void loadMotifs();
    }
  };

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Design Builder"
        subtitle="Select a SKU, customize motifs & components, build jewellery"
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {motifsError && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-amber-200 bg-amber-50 text-amber-800">
          {motifsError}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-emerald-200 bg-emerald-50 text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="mb-8">
        <SkuDesignList
          designs={designs}
          selectedId={selectedId}
          onSelect={handleSelectDesign}
        />
      </div>

      {!selectedDesign ? (
        <div className="surface-card px-5 py-12 text-center rounded-xl">
          <p className="text-sm text-zinc-500">
            {designs.length === 0
              ? "No SKUs yet. Click New design to create one."
              : "Select a SKU from the list above to load motifs and start building."}
          </p>
          {canManage && designs.length === 0 && (
            <Link
              href="/designs/new"
              className="btn-primary inline-block mt-4 px-4 py-2 text-sm"
            >
              Create first SKU
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {selectedDesign.builderStage !== "Complete" && canManage && (
            <div className="surface-card px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50/50">
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Design builder in progress
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Current stage: {selectedDesign.builderStage}
                </p>
              </div>
              <Link
                href={
                  selectedDesign.builderStage === "SKU" ||
                  selectedDesign.builderStage === "CAD"
                    ? `/designs/${selectedDesign.id}/builder/cad`
                    : selectedDesign.builderStage === "Mold Making"
                      ? `/designs/${selectedDesign.id}/builder/mold`
                      : selectedDesign.builderStage === "Motifs"
                        ? `/designs/${selectedDesign.id}/builder/motifs`
                        : `/designs/${selectedDesign.id}/builder/photo`
                }
                className="btn-primary px-4 py-2 text-sm"
              >
                Continue builder →
              </Link>
            </div>
          )}
          {selectedDesign && (
            <>
              <DesignPriceDriftPanel
                designId={selectedDesign.id}
                canManage={canManage}
                onUpdated={() => void refresh()}
              />
              <DesignHistoryPanel designId={selectedDesign.id} />
            </>
          )}

          {/* Motif library */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-700">
                  Motif library
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Select motifs for {selectedDesign.code}
                  {totalMotifPieces > 0 &&
                    ` · ${totalMotifPieces} piece${totalMotifPieces !== 1 ? "s" : ""} across ${selectedMotifCount} motif${selectedMotifCount !== 1 ? "s" : ""}`}
                </p>
              </div>
              <input
                value={motifSearch}
                onChange={(e) => setMotifSearch(e.target.value)}
                className="input-field w-full max-w-xs px-3 py-2 text-sm"
                placeholder="Search motifs…"
                disabled={!metal || !purity}
              />
            </div>

            {!metal || !purity ? (
              <div className="surface-card rounded-xl px-5 py-8 text-center">
                <p className="text-sm text-zinc-500">
                  Select metal and purity in Metal & pricing below to browse matching motifs.
                </p>
              </div>
            ) : motifsLoading ? (
              <p className="text-sm text-zinc-400">Loading motifs…</p>
            ) : filteredMotifs.length === 0 ? (
              <div className="surface-card rounded-xl px-5 py-8 text-center">
                <p className="text-sm text-zinc-500">
                  {motifs.length === 0
                    ? "No motifs in the library yet. Create one to get started."
                    : `No ${metal} ${purity} motifs match your search.`}
                </p>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setMotifModalOpen(true)}
                    className="btn-primary mt-4 px-4 py-2 text-sm"
                  >
                    Add motif for {metal} {purity}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {filteredMotifs.map((motif) => (
                  <MotifCard
                    key={motif.id}
                    name={motif.name}
                    type="Motif"
                    price={motif.price}
                    imageUrl={motif.imageUrl}
                    subtitle={`${motif.metal} ${motif.purity} · ${motif.subCategory}${motif.weightGrams != null ? ` · ${motif.weightGrams}g` : ""}`}
                    quantity={motifQuantities[motif.id] ?? 0}
                    onQuantityChange={(qty) => setMotifQuantity(motif.id, qty)}
                    disabled={!canManage}
                  />
                ))}
                {canManage && (
                  <AddMotifCard onClick={() => setMotifModalOpen(true)} />
                )}
              </div>
            )}
          </section>

          {/* Stones & Casting dropdowns */}
          {(stoneElements.length > 0 ||
            castingElements.length > 0 ||
            stoneOptions.length > 0 ||
            castingOptions.length > 0) && (
            <section className="surface-card rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-700">
                Stones & casting
              </h2>

              {stoneElements.map((stone) => (
                <div key={stone.id} className="grid sm:grid-cols-2 gap-2 items-center">
                  <label className="text-sm text-zinc-600">Stone</label>
                  <select
                    value={stonePick[stone.id] ?? elementKey(stone.type, stone.name)}
                    onChange={(e) =>
                      setStonePick((prev) => ({
                        ...prev,
                        [stone.id]: e.target.value,
                      }))
                    }
                    disabled={!canManage}
                    className={inputClass}
                  >
                    {stoneOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.name}
                        {opt.unitValue != null
                          ? ` — ₹${opt.unitValue.toLocaleString("en-IN")}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {stoneElements.length === 0 && stoneOptions.length > 0 && canManage && (
                <div className="grid sm:grid-cols-2 gap-2 items-center">
                  <label className="text-sm text-zinc-600">Add stone</label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const id = `new-stone-${Date.now()}`;
                      setStonePick((prev) => ({
                        ...prev,
                        [id]: e.target.value,
                      }));
                    }}
                    className={inputClass}
                  >
                    <option value="">Choose a stone…</option>
                    {stoneOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.name}
                        {opt.unitValue != null
                          ? ` — ₹${opt.unitValue.toLocaleString("en-IN")}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {castingElements.map((casting) => (
                <div key={casting.id} className="grid sm:grid-cols-2 gap-2 items-center">
                  <label className="text-sm text-zinc-600">Casting</label>
                  <select
                    value={
                      castingPick[casting.id] ??
                      elementKey(casting.type, casting.name)
                    }
                    onChange={(e) =>
                      setCastingPick((prev) => ({
                        ...prev,
                        [casting.id]: e.target.value,
                      }))
                    }
                    disabled={!canManage}
                    className={inputClass}
                  >
                    {castingOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.name}
                        {opt.weightGramsPerPc != null
                          ? ` — ${opt.weightGramsPerPc}g`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {castingElements.length === 0 &&
                castingOptions.length > 0 &&
                canManage && (
                  <div className="grid sm:grid-cols-2 gap-2 items-center">
                    <label className="text-sm text-zinc-600">Add casting</label>
                    <select
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const id = `new-casting-${Date.now()}`;
                        setCastingPick((prev) => ({
                          ...prev,
                          [id]: e.target.value,
                        }));
                      }}
                      className={inputClass}
                    >
                      <option value="">Choose casting…</option>
                      {castingOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.name}
                          {opt.weightGramsPerPc != null
                            ? ` — ${opt.weightGramsPerPc}g`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
            </section>
          )}

          {canManage && (
            <DesignBomImport
              designId={selectedDesign.id}
              disabled={!canManage}
              onApplied={() => void refresh()}
            />
          )}

          {/* Metal & pricing */}
          <section className="surface-card rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">
              Metal & pricing
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as DesignCategory | "")
                  }
                  disabled={!canManage}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1">
                  Metal
                </label>
                <select
                  value={metal}
                  onChange={(e) =>
                    setMetal(e.target.value as MetalType | "")
                  }
                  disabled={!canManage}
                  className={inputClass}
                >
                  <option value="">Select metal…</option>
                  {METALS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1">
                  Purity
                </label>
                <select
                  value={purity}
                  onChange={(e) =>
                    setPurity(e.target.value as Purity | "")
                  }
                  disabled={!canManage}
                  className={inputClass}
                >
                  <option value="">Select purity…</option>
                  {PURITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1">
                  Making charges (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={makingCharges}
                  onChange={(e) => setMakingCharges(e.target.value)}
                  disabled={!canManage}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-100">
              <div>
                <p className="text-xs text-zinc-500">Calculated weight</p>
                <p className="text-lg font-semibold text-zinc-900">
                  {calculatedDesignWeight.toFixed(2)}g
                </p>
                <p className="text-[11px] text-zinc-400">
                  Auto-sum of motif & casting weights
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Estimated price</p>
                <p className="text-2xl font-semibold text-zinc-900">
                  ₹{estimatedPrice.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {totalComponentPieces} piece
                  {totalComponentPieces !== 1 ? "s" : ""} across{" "}
                  {previewElements.length} component
                  {previewElements.length !== 1 ? "s" : ""}
                </p>
              </div>

              {canManage && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete SKU ${selectedDesign.code}? This cannot be undone.`,
                        )
                      ) {
                        void (async () => {
                          try {
                            await removeDesign(selectedDesign.id);
                            setSelectedId(null);
                          } catch (err) {
                            setSaveError(
                              getApiErrorMessage(err, "Failed to delete SKU."),
                            );
                          }
                        })();
                      }
                    }}
                    className="btn-secondary px-4 py-2 text-sm flex items-center gap-2 text-red-600"
                  >
                    <Trash2 size={16} />
                    Delete SKU
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveJewelry()}
                    disabled={saving}
                    className="btn-primary px-6 py-2 text-sm"
                  >
                    {saving ? "Saving…" : "Save jewellery"}
                  </button>
                  {buildTargetElements().length > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleSendToProduction()}
                      disabled={saving}
                      className="btn-secondary px-6 py-2 text-sm"
                    >
                      {saving ? "Saving…" : "Send to Production →"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {saveError && (
              <p className="text-xs text-red-500">{saveError}</p>
            )}
          </section>
        </div>
      )}

      {modalOpen && (
        <AddDesignModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreateDesign}
        />
      )}

      {motifModalOpen && selectedDesign && (
        <AddMotifModal
          open={motifModalOpen}
          skuCode={selectedDesign.code}
          designMetal={metal}
          designPurity={purity}
          onClose={() => setMotifModalOpen(false)}
          onSubmit={handleAddMotif}
          onMotifCreated={loadMotifs}
        />
      )}

      {productionRunModalOpen && selectedDesign && (
        <AddProductionRunModal
          open={productionRunModalOpen}
          onClose={() => setProductionRunModalOpen(false)}
          designs={designs}
          initialDesignId={selectedDesign.id}
          onSubmit={handleCreateProductionRun}
        />
      )}

      <BomDiffModal
        open={bomDiffOpen}
        diff={bomDiff}
        onConfirm={() => void handleConfirmBomDiff()}
        onCancel={() => {
          setBomDiffOpen(false);
          setBomDiff(null);
        }}
        saving={saving}
      />
    </div>
  );
}
