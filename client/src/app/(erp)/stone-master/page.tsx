"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteRawInventory } from "@/lib/auth/permissions";
import {
  createStoneMaster,
  fetchStoneMasters,
  updateStoneMaster,
} from "@/lib/api/stone-master";
import {
  STONE_CATEGORIES,
  STONE_MATERIALS,
  STONE_ORIGIN_TYPES,
  STONE_SHAPES,
  STONE_UOMS,
} from "@/lib/stones/materials";
import type {
  NewStoneMasterInput,
  StoneCategory,
  StoneMaster,
  StoneOriginType,
  StoneShape,
  StoneUOM,
} from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

const emptyForm = (): NewStoneMasterInput => ({
  stoneCode: "",
  stoneName: "",
  stoneCategory: "CZ",
  stoneType: "Synthetic",
  stoneMaterial: "Zircon",
  shape: "Round",
  sizeMm: "",
  color: "",
  clarityGrade: "",
  cut: "",
  uom: "Pcs",
  unitWeightCt: undefined,
  isActive: true,
  notes: "",
});

export default function StoneMasterPage() {
  const { user } = useAuth();
  const canManage = user ? canWriteRawInventory(user.role) : false;

  const [stones, setStones] = useState<StoneMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<StoneCategory | "">("");
  const [activeOnly, setActiveOnly] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StoneMaster | null>(null);
  const [form, setForm] = useState<NewStoneMasterInput>(emptyForm());
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStones(
        await fetchStoneMasters({
          category: category || undefined,
          activeOnly,
          search: search.trim() || undefined,
        }),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load stone master catalog."));
    } finally {
      setLoading(false);
    }
  }, [activeOnly, category, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredMaterials = useMemo(() => {
    const q = materialSearch.trim().toLowerCase();
    if (!q) return STONE_MATERIALS;
    return STONE_MATERIALS.filter((m) => m.toLowerCase().includes(q));
  }, [materialSearch]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setMaterialSearch("");
    setModalOpen(true);
  };

  const openEdit = (stone: StoneMaster) => {
    setEditing(stone);
    setForm({
      stoneCode: stone.stoneCode,
      stoneName: stone.stoneName,
      stoneCategory: stone.stoneCategory,
      stoneType: stone.stoneType,
      stoneMaterial: stone.stoneMaterial,
      shape: stone.shape,
      sizeMm: stone.sizeMm,
      color: stone.color,
      clarityGrade: stone.clarityGrade ?? "",
      cut: stone.cut ?? "",
      uom: stone.uom,
      unitWeightCt: stone.unitWeightCt,
      isActive: stone.isActive,
      notes: stone.notes ?? "",
    });
    setFormError("");
    setMaterialSearch("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setFormError("");
    setSubmitting(true);
    try {
      if (editing) {
        const updated = await updateStoneMaster(editing.id, form);
        setStones((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
      } else {
        const created = await createStoneMaster(form);
        setStones((prev) => [...prev, created]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to save stone master entry."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && stones.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stone Master"
        subtitle="Catalog of stone types — shared across all branches in your company"
        action={
          canManage ? (
            <button type="button" onClick={openCreate} className="btn-primary px-4 py-2 text-sm">
              + Add Stone
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, shape, size…"
          className="input-field px-3 py-2 text-sm min-w-[240px]"
        />
        <div className="flex flex-wrap gap-1">
          <FilterChip active={!category} onClick={() => setCategory("")}>All</FilterChip>
          {STONE_CATEGORIES.map((c) => (
            <FilterChip
              key={c.value}
              active={category === c.value}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </FilterChip>
          ))}
        </div>
        <label className="text-sm text-zinc-600 inline-flex items-center gap-2 ml-auto">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Active only
        </label>
      </div>

      <p className="text-sm text-zinc-500">
        Manage purchase receipts in{" "}
        <Link href="/stone-master/lots" className="text-amber-700 hover:underline">
          Stone Lots
        </Link>
        .
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Shape</th>
              <th className="text-left px-4 py-3">Size</th>
              <th className="text-left px-4 py-3">Color</th>
              <th className="text-left px-4 py-3">UOM</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {stones.map((stone) => (
              <tr
                key={stone.id}
                className="border-t border-zinc-100 hover:bg-zinc-50/80 cursor-pointer"
                onClick={() => canManage && openEdit(stone)}
              >
                <td className="px-4 py-3 font-mono text-xs">{stone.stoneCode}</td>
                <td className="px-4 py-3">{stone.stoneName}</td>
                <td className="px-4 py-3">{stone.stoneCategory}</td>
                <td className="px-4 py-3">{stone.shape}</td>
                <td className="px-4 py-3">{stone.sizeMm}</td>
                <td className="px-4 py-3">{stone.color}</td>
                <td className="px-4 py-3">{stone.uom}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      stone.isActive
                        ? "text-emerald-700"
                        : "text-zinc-400"
                    }
                  >
                    {stone.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {stones.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-400">
                  No stone master entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "Edit Stone Master" : "Add Stone to Master"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Stone Code (Vendor's)">
                  <input
                    className={fieldClass}
                    value={form.stoneCode}
                    onChange={(e) => setForm({ ...form, stoneCode: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Stone Name">
                  <input
                    className={fieldClass}
                    value={form.stoneName}
                    onChange={(e) => setForm({ ...form, stoneName: e.target.value })}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Stone Category">
                  <select
                    className={fieldClass}
                    value={form.stoneCategory}
                    onChange={(e) =>
                      setForm({ ...form, stoneCategory: e.target.value as StoneCategory })
                    }
                  >
                    {STONE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Stone Type">
                  <select
                    className={fieldClass}
                    value={form.stoneType}
                    onChange={(e) =>
                      setForm({ ...form, stoneType: e.target.value as StoneOriginType })
                    }
                  >
                    {STONE_ORIGIN_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Stone Material">
                <input
                  className={fieldClass}
                  value={materialSearch || form.stoneMaterial}
                  onChange={(e) => {
                    setMaterialSearch(e.target.value);
                    setForm({ ...form, stoneMaterial: e.target.value });
                  }}
                  list="stone-materials"
                  required
                />
                <datalist id="stone-materials">
                  {filteredMaterials.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </Field>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Shape">
                  <select
                    className={fieldClass}
                    value={form.shape}
                    onChange={(e) =>
                      setForm({ ...form, shape: e.target.value as StoneShape })
                    }
                  >
                    {STONE_SHAPES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Size (mm)">
                  <input
                    className={fieldClass}
                    value={form.sizeMm}
                    onChange={(e) => setForm({ ...form, sizeMm: e.target.value })}
                    placeholder="2 or 4x6"
                    required
                  />
                </Field>
                <Field label="Color">
                  <input
                    className={fieldClass}
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Clarity / Grade">
                  <input
                    className={fieldClass}
                    value={form.clarityGrade ?? ""}
                    onChange={(e) => setForm({ ...form, clarityGrade: e.target.value })}
                  />
                </Field>
                <Field label="Cut">
                  <input
                    className={fieldClass}
                    value={form.cut ?? ""}
                    onChange={(e) => setForm({ ...form, cut: e.target.value })}
                  />
                </Field>
                <Field label="Unit of Measure">
                  <select
                    className={fieldClass}
                    value={form.uom}
                    onChange={(e) => setForm({ ...form, uom: e.target.value as StoneUOM })}
                  >
                    {STONE_UOMS.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Unit Weight (Ct)">
                  <input
                    type="number"
                    step="0.000001"
                    className={fieldClass}
                    value={form.unitWeightCt ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        unitWeightCt: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </Field>
                <Field label="Active">
                  <select
                    className={fieldClass}
                    value={form.isActive ? "yes" : "no"}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.value === "yes" })
                    }
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  className={fieldClass}
                  rows={2}
                  value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>

              {formError && <p className="text-xs text-red-500">{formError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary px-4 py-2 text-sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {submitting ? "Saving…" : "Save Stone Master"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs border ${
        active
          ? "bg-amber-100 border-amber-300 text-amber-900"
          : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}
