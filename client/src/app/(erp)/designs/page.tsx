"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import MotifCard from "@/app/(components)/designs/MotifCard";
import AddMotifCard from "@/app/(components)/designs/AddMotifCard";
import SkuSearchDropdown from "@/app/(components)/designs/SkuSearchDropdown";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageDesigns } from "@/lib/auth/permissions";
import { useDesigns } from "@/lib/designs/designs-context";
import { fetchMotifs } from "@/lib/api/motifs";
import type {
  Design,
  DesignCategory,
  DesignElementType,
  MetalType,
  Motif,
  NewDesignElementInput,
  Purity,
} from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const AddDesignModal = dynamic(
  () => import("@/app/(components)/AddDesignModal"),
  { ssr: false },
);

const AddMotifModal = dynamic(
  () => import("@/app/(components)/designs/AddMotifModal"),
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
    if (el.type === "Casting") {
      const wt = el.weightGramsPerPc ?? 0;
      return sum + wt * 5000;
    }
    return sum + (el.unitValue ?? 0);
  }, 0);
  return component + (makingCharges ?? 0);
}

export default function DesignsPage() {
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
    removeElement,
  } = useDesigns();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [motifModalOpen, setMotifModalOpen] = useState(false);
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [motifsLoading, setMotifsLoading] = useState(true);
  const [motifsError, setMotifsError] = useState<string | null>(null);
  const [motifSearch, setMotifSearch] = useState("");
  const [activeMotifKeys, setActiveMotifKeys] = useState<Set<string>>(new Set());
  const [stonePick, setStonePick] = useState<Record<string, string>>({});
  const [castingPick, setCastingPick] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<DesignCategory | "">("");
  const [metal, setMetal] = useState<MetalType | "">("");
  const [purity, setPurity] = useState<Purity | "">("");
  const [makingCharges, setMakingCharges] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

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

  const motifByKey = useMemo(() => {
    const map = new Map<string, Motif>();
    for (const motif of motifs) {
      map.set(elementKey("Motif", motif.name), motif);
    }
    return map;
  }, [motifs]);

  const filteredMotifs = useMemo(() => {
    const q = motifSearch.trim().toLowerCase();
    if (!q) return motifs;
    return motifs.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.metal.toLowerCase().includes(q) ||
        m.subCategory.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q),
    );
  }, [motifs, motifSearch]);

  const selectedMotifKeys = activeMotifKeys;

  const selectedDesign = useMemo(
    () => designs.find((d) => d.id === selectedId) ?? null,
    [designs, selectedId],
  );

  const syncFromDesign = useCallback((design: Design) => {
    const motifsOnDesign = design.elements.filter((e) => e.type === "Motif");
    setActiveMotifKeys(
      new Set(motifsOnDesign.map((m) => elementKey(m.type, m.name))),
    );

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
  }, []);

  useEffect(() => {
    if (selectedDesign) syncFromDesign(selectedDesign);
  }, [selectedDesign, syncFromDesign]);

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

    for (const key of selectedMotifKeys) {
      const motif = motifByKey.get(key);
      if (motif) {
        items.push({
          key,
          name: motif.name,
          type: "Motif",
          unitValue: motif.price,
        });
        continue;
      }
      const el = library.find((l) => l.key === key);
      if (el) items.push(el);
    }
    for (const key of Object.values(stonePick)) {
      const el = library.find((l) => l.key === key);
      if (el) items.push(el);
    }
    for (const key of Object.values(castingPick)) {
      const el = library.find((l) => l.key === key);
      if (el) items.push(el);
    }
    return items;
  }, [
    library,
    selectedMotifKeys,
    motifByKey,
    stonePick,
    castingPick,
  ]);

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

  const toggleMotif = (key: string) => {
    if (!canManage) return;
    setActiveMotifKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const buildTargetElements = (): NewDesignElementInput[] => {
    const result: NewDesignElementInput[] = [];

    for (const key of selectedMotifKeys) {
      const motif = motifByKey.get(key);
      if (motif) {
        result.push({
          name: motif.name,
          type: "Motif",
          qtyPerSet: 1,
          unitValue: motif.price,
        });
        continue;
      }
      const el = library.find((l) => l.key === key);
      if (el) {
        result.push({
          name: el.name,
          type: "Motif",
          qtyPerSet: 1,
          unitValue: el.unitValue,
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

  const handleSaveJewelry = async () => {
    if (!selectedDesign || !canManage) return;
    setSaving(true);
    setSaveError("");

    try {
      const making =
        makingCharges.trim() === ""
          ? null
          : parseFloat(makingCharges);
      if (making != null && (Number.isNaN(making) || making < 0)) {
        setSaveError("Invalid making charges.");
        setSaving(false);
        return;
      }

      await patchDesign(selectedDesign.id, {
        category: category || null,
        metal: metal || null,
        purity: purity || null,
        makingChargesPerSet: making,
      });

      const target = buildTargetElements();
      const current = selectedDesign.elements;

      const targetKeys = new Set(
        target.map((t) => elementKey(t.type, t.name)),
      );
      const currentKeys = new Map(
        current.map((e) => [elementKey(e.type, e.name), e]),
      );

      for (const [key, el] of currentKeys) {
        if (!targetKeys.has(key)) {
          await removeElement(selectedDesign.id, el.id);
        }
      }

      for (const t of target) {
        const key = elementKey(t.type, t.name);
        if (!currentKeys.has(key)) {
          await addElement(selectedDesign.id, t);
        }
      }
    } catch (err) {
      setSaveError(getApiErrorMessage(err, "Failed to save jewelry."));
    } finally {
      setSaving(false);
    }
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
  }) => {
    if (!selectedDesign) return;
    await addElement(selectedDesign.id, {
      name: input.name,
      type: input.type,
      qtyPerSet: 1,
      unitValue: input.unitValue,
      weightGramsPerPc: input.weightGramsPerPc,
    });
    const key = elementKey(input.type, input.name);
    if (input.type === "Motif") {
      setActiveMotifKeys((prev) => new Set(prev).add(key));
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

      <div className="mb-8">
        <SkuSearchDropdown
          designs={designs}
          selectedId={selectedId}
          onSelect={handleSelectDesign}
          onCreateNew={() => setModalOpen(true)}
          disabled={!canManage && designs.length === 0}
        />
      </div>

      {!selectedDesign ? (
        <div className="surface-card px-5 py-12 text-center rounded-xl">
          <p className="text-sm text-zinc-500">
            {designs.length === 0
              ? "No SKUs yet. Create your first design pattern."
              : "Select a SKU above to load motifs and start building."}
          </p>
          {canManage && designs.length === 0 && (
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary mt-4 px-4 py-2 text-sm"
            >
              Create first SKU
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Motif library */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-700">
                  Motif library
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Select motifs for {selectedDesign.code}
                  {selectedMotifKeys.size > 0 &&
                    ` · ${selectedMotifKeys.size} selected`}
                </p>
              </div>
              <input
                value={motifSearch}
                onChange={(e) => setMotifSearch(e.target.value)}
                className="input-field w-full max-w-xs px-3 py-2 text-sm"
                placeholder="Search motifs…"
              />
            </div>

            {motifsLoading ? (
              <p className="text-sm text-zinc-400">Loading motifs…</p>
            ) : filteredMotifs.length === 0 ? (
              <div className="surface-card rounded-xl px-5 py-8 text-center">
                <p className="text-sm text-zinc-500">
                  {motifs.length === 0
                    ? "No motifs in the library yet. Create one to get started."
                    : "No motifs match your search."}
                </p>
                {canManage && motifs.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setMotifModalOpen(true)}
                    className="btn-primary mt-4 px-4 py-2 text-sm"
                  >
                    Create first motif
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {filteredMotifs.map((motif) => {
                  const key = elementKey("Motif", motif.name);
                  return (
                    <MotifCard
                      key={motif.id}
                      name={motif.name}
                      type="Motif"
                      price={motif.price}
                      imageUrl={motif.imageUrl}
                      subtitle={`${motif.metal} · ${motif.subCategory}`}
                      selected={selectedMotifKeys.has(key)}
                      onClick={() => toggleMotif(key)}
                      disabled={!canManage}
                    />
                  );
                })}
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
                  <option value="">Gold</option>
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
                  <option value="">22K</option>
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
                <p className="text-xs text-zinc-500">Estimated price</p>
                <p className="text-2xl font-semibold text-zinc-900">
                  ₹{estimatedPrice.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {previewElements.length} component
                  {previewElements.length !== 1 ? "s" : ""} selected
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
                    onClick={handleSaveJewelry}
                    disabled={saving}
                    className="btn-primary px-6 py-2 text-sm"
                  >
                    {saving ? "Saving…" : "Save jewellery"}
                  </button>
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
          onClose={() => setMotifModalOpen(false)}
          onSubmit={handleAddMotif}
          onMotifCreated={loadMotifs}
        />
      )}
    </div>
  );
}
