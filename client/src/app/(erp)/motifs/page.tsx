"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import MotifExcelImport from "@/app/(components)/motifs/MotifExcelImport";
import MotifImageUpload from "@/app/(components)/motifs/MotifImageUpload";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageMotifs } from "@/lib/auth/permissions";
import {
  createMotif,
  createMotifsBulk,
  deleteMotif,
  fetchMotifs,
  updateMotif,
} from "@/lib/api/motifs";
import {
  MOTIF_METALS,
  MOTIF_STONE_TYPES,
  MOTIF_SUB_CATEGORIES,
} from "@/lib/motifs/constants";
import type {
  Motif,
  MotifMetal,
  MotifStoneType,
  MotifSubCategory,
  NewMotifInput,
} from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

const emptyStone = "";

export default function MotifsPage() {
  const { user } = useAuth();
  const canManage = user ? canManageMotifs(user.role) : false;

  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [metal, setMetal] = useState<MotifMetal>("Gold");
  const [stone1, setStone1] = useState(emptyStone);
  const [stone2, setStone2] = useState(emptyStone);
  const [stone3, setStone3] = useState(emptyStone);
  const [subCategory, setSubCategory] = useState<MotifSubCategory>("Contemporary");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");

  const loadMotifs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMotifs(await fetchMotifs());
    } catch {
      setError("Could not load motifs. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMotifs();
  }, [loadMotifs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return motifs;
    return motifs.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.metal.toLowerCase().includes(q) ||
        m.subCategory.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q),
    );
  }, [motifs, search]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setWeightGrams("");
    setMetal("Gold");
    setStone1(emptyStone);
    setStone2(emptyStone);
    setStone3(emptyStone);
    setSubCategory("Contemporary");
    setPrice("");
    setImageUrl(undefined);
    setFormError("");
  };

  const buildInput = (): NewMotifInput => ({
    name: name.trim(),
    description: description.trim() || undefined,
    weightGrams: weightGrams.trim() ? parseFloat(weightGrams) : undefined,
    metal,
    stone1: (stone1 || undefined) as MotifStoneType | undefined,
    stone2: (stone2 || undefined) as MotifStoneType | undefined,
    stone3: (stone3 || undefined) as MotifStoneType | undefined,
    subCategory,
    price: price.trim() ? parseFloat(price) : undefined,
    imageUrl,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setFormError("");

    if (!name.trim()) {
      setFormError("Motif name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const motif = await createMotif(buildInput());
      setMotifs((prev) =>
        [...prev, motif].sort((a, b) => a.name.localeCompare(b.name)),
      );
      resetForm();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to create motif."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkImport = async (items: NewMotifInput[]) => {
    const result = await createMotifsBulk(items);
    if (result.created.length) {
      setMotifs((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        for (const m of result.created) map.set(m.id, m);
        return Array.from(map.values()).sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });
    }
    return { created: result.created.length, errors: result.errors };
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this motif?")) return;
    try {
      await deleteMotif(id);
      setMotifs((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete motif."));
    }
  };

  const handleImageUpdate = async (motif: Motif, url: string | undefined) => {
    if (!canManage) return;
    try {
      const updated = await updateMotif(motif.id, { imageUrl: url ?? null });
      setMotifs((prev) => prev.map((m) => (m.id === motif.id ? updated : m)));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update image."));
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Motif Library"
        subtitle="Create motifs, upload images, or bulk import from Excel"
      />

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form
          onSubmit={handleSubmit}
          className="surface-card rounded-xl p-5 space-y-4"
        >
          <h2 className="text-base font-semibold text-zinc-900">Create motif</h2>

          <div>
            <label className={labelClass}>Motif name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
              placeholder="e.g. Crescent moon charm"
              disabled={!canManage}
            />
          </div>

          <div>
            <label className={labelClass}>Motif description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${fieldClass} min-h-[80px] resize-y`}
              placeholder="Short description of the motif"
              disabled={!canManage}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Motif weight (grams)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                className={fieldClass}
                placeholder="e.g. 4.5"
                disabled={!canManage}
              />
            </div>
            <div>
              <label className={labelClass}>Price (₹)</label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={fieldClass}
                placeholder="e.g. 850"
                disabled={!canManage}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Motif metal</label>
              <select
                value={metal}
                onChange={(e) => setMetal(e.target.value as MotifMetal)}
                className={fieldClass}
                disabled={!canManage}
              >
                {MOTIF_METALS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Sub category</label>
              <select
                value={subCategory}
                onChange={(e) =>
                  setSubCategory(e.target.value as MotifSubCategory)
                }
                className={fieldClass}
                disabled={!canManage}
              >
                {MOTIF_SUB_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Stones on motif (optional)</label>
            <div className="grid sm:grid-cols-3 gap-3 mt-1">
              {[stone1, stone2, stone3].map((value, index) => (
                <select
                  key={index}
                  value={value}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (index === 0) setStone1(v);
                    if (index === 1) setStone2(v);
                    if (index === 2) setStone3(v);
                  }}
                  className={fieldClass}
                  disabled={!canManage}
                >
                  <option value="">None</option>
                  {MOTIF_STONE_TYPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ))}
            </div>
          </div>

          <MotifImageUpload
            imageUrl={imageUrl}
            onChange={setImageUrl}
            disabled={!canManage}
          />

          {formError && <p className="text-xs text-red-500">{formError}</p>}

          {canManage && (
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5 text-sm"
            >
              {submitting ? "Saving…" : "Save motif"}
            </button>
          )}
        </form>

        {canManage ? (
          <MotifExcelImport onImport={handleBulkImport} />
        ) : (
          <div className="surface-card rounded-xl p-5 text-sm text-zinc-500">
            Excel import is available to Admin and Production Manager roles.
          </div>
        )}
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-zinc-900">
            All motifs ({filtered.length})
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full max-w-xs px-3 py-2 text-sm"
            placeholder="Search motifs…"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="surface-card rounded-xl p-8 text-center text-sm text-zinc-400">
            No motifs yet. Create one above or import from Excel.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((motif) => (
              <article
                key={motif.id}
                className="surface-card rounded-xl overflow-hidden border border-zinc-200"
              >
                <div className="aspect-[4/3] bg-zinc-100 relative">
                  {motif.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={motif.imageUrl}
                      alt={motif.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-zinc-900 truncate">
                        {motif.name}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {motif.metal} · {motif.subCategory}
                      </p>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(motif.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 shrink-0"
                        aria-label="Delete motif"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {motif.description && (
                    <p className="text-xs text-zinc-600 line-clamp-2">
                      {motif.description}
                    </p>
                  )}
                  <p className="text-sm font-medium text-zinc-900">
                    {motif.price != null
                      ? `₹${motif.price.toLocaleString("en-IN")}`
                      : "Price —"}
                    {motif.weightGrams != null && (
                      <span className="text-xs font-normal text-zinc-500 ml-2">
                        {motif.weightGrams}g
                      </span>
                    )}
                  </p>
                  {[motif.stone1, motif.stone2, motif.stone3].filter(Boolean)
                    .length > 0 && (
                    <p className="text-[11px] text-zinc-500">
                      Stones:{" "}
                      {[motif.stone1, motif.stone2, motif.stone3]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {canManage && (
                    <label className="block text-[11px] text-blue-600 cursor-pointer hover:underline">
                      Upload / change image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          void (async () => {
                            const { processImageFile } = await import(
                              "@/lib/inventory/images"
                            );
                            const url = await processImageFile(file);
                            await handleImageUpdate(motif, url);
                          })();
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
