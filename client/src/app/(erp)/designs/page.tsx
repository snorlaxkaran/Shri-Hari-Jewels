"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canManageDesigns,
} from "@/lib/auth/permissions";
import { useDesigns } from "@/lib/designs/designs-context";
import type {
  Design,
  DesignCategory,
  DesignElementType,
} from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const AddDesignModal = dynamic(
  () => import("@/app/(components)/AddDesignModal"),
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

const ELEMENT_TYPES: DesignElementType[] = ["Motif", "Stone", "Casting"];

const inputClass = "input-field w-full px-2 py-1 text-xs";

function DesignCard({
  design,
  canManage,
  onPatchDesign,
  onRemoveDesign,
  onAddElement,
  onPatchElement,
  onRemoveElement,
}: {
  design: Design;
  canManage: boolean;
  onPatchDesign: (
    id: string,
    input: { name?: string | null; category?: DesignCategory | null },
  ) => Promise<void>;
  onRemoveDesign: (id: string) => Promise<void>;
  onAddElement: (
    designId: string,
    input: { name: string; type: DesignElementType; qtyPerSet: number },
  ) => Promise<void>;
  onPatchElement: (
    designId: string,
    elementId: string,
    input: {
      name?: string;
      type?: DesignElementType;
      qtyPerSet?: number;
    },
  ) => Promise<void>;
  onRemoveElement: (designId: string, elementId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(design.name ?? "");
  const [category, setCategory] = useState<DesignCategory | "">(
    design.category ?? "",
  );
  const [newElementName, setNewElementName] = useState("");
  const [newElementType, setNewElementType] =
    useState<DesignElementType>("Motif");
  const [newElementQty, setNewElementQty] = useState("1");
  const [elementDrafts, setElementDrafts] = useState<
    Record<string, { name: string; type: DesignElementType; qtyPerSet: string }>
  >({});
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const getElementDraft = (elementId: string, element: Design["elements"][0]) =>
    elementDrafts[elementId] ?? {
      name: element.name,
      type: element.type,
      qtyPerSet: String(element.qtyPerSet),
    };

  const handleNameBlur = async () => {
    if (!canManage) return;
    const trimmed = name.trim();
    if (trimmed === (design.name ?? "")) return;
    try {
      await onPatchDesign(design.id, { name: trimmed || null });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update design."));
      setName(design.name ?? "");
    }
  };

  const handleCategoryChange = async (value: DesignCategory | "") => {
    if (!canManage) return;
    setCategory(value);
    try {
      await onPatchDesign(design.id, { category: value || null });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update design."));
      setCategory(design.category ?? "");
    }
  };

  const handleElementBlur = async (
    elementId: string,
    field: "name" | "type" | "qtyPerSet",
  ) => {
    if (!canManage) return;
    const element = design.elements.find((e) => e.id === elementId);
    if (!element) return;

    const draft = getElementDraft(elementId, element);
    const qty = parseInt(draft.qtyPerSet, 10);

    const updates: {
      name?: string;
      type?: DesignElementType;
      qtyPerSet?: number;
    } = {};

    if (field === "name" && draft.name.trim() !== element.name) {
      updates.name = draft.name.trim();
    }
    if (field === "type" && draft.type !== element.type) {
      updates.type = draft.type;
    }
    if (field === "qtyPerSet" && qty !== element.qtyPerSet) {
      if (!qty || qty < 1) {
        setElementDrafts((prev) => ({
          ...prev,
          [elementId]: {
            ...draft,
            qtyPerSet: String(element.qtyPerSet),
          },
        }));
        return;
      }
      updates.qtyPerSet = qty;
    }

    if (Object.keys(updates).length === 0) return;

    try {
      await onPatchElement(design.id, elementId, updates);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update element."));
      setElementDrafts((prev) => {
        const next = { ...prev };
        delete next[elementId];
        return next;
      });
    }
  };

  const handleAddElement = async () => {
    if (!canManage) return;
    const qty = parseInt(newElementQty, 10);
    if (!newElementName.trim()) {
      setError("Element name is required.");
      return;
    }
    if (!qty || qty < 1) {
      setError("Quantity per set must be at least 1.");
      return;
    }
    setError("");
    try {
      await onAddElement(design.id, {
        name: newElementName.trim(),
        type: newElementType,
        qtyPerSet: qty,
      });
      setNewElementName("");
      setNewElementType("Motif");
      setNewElementQty("1");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add element."));
    }
  };

  const handleDeleteDesign = async () => {
    if (!canManage) return;
    if (
      !window.confirm(
        `Delete design ${design.code}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await onRemoveDesign(design.id);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete design."));
      setDeleting(false);
    }
  };

  const handleDeleteElement = async (elementId: string) => {
    if (!canManage) return;
    try {
      await onRemoveElement(design.id, elementId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete element."));
    }
  };

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 rounded text-zinc-400 hover:text-zinc-600"
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-900">{design.code}</span>
            {design.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                {design.category}
              </span>
            )}
            <span className="text-xs text-zinc-400">
              {design.elements.length} element
              {design.elements.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        {canManage && (
          <button
            onClick={handleDeleteDesign}
            disabled={deleting}
            className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50"
            title="Delete design"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-zinc-100 px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                disabled={!canManage}
                className={inputClass}
                placeholder="Optional name"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) =>
                  handleCategoryChange(e.target.value as DesignCategory | "")
                }
                disabled={!canManage}
                className={inputClass}
              >
                <option value="">None</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500">
                  <th className="text-left px-3 py-2 font-medium">Element</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Type</th>
                  <th className="text-left px-3 py-2 font-medium w-24">
                    Qty/Set
                  </th>
                  {canManage && (
                    <th className="text-left px-3 py-2 font-medium w-12" />
                  )}
                </tr>
              </thead>
              <tbody>
                {design.elements.map((element) => {
                  const draft = getElementDraft(element.id, element);
                  return (
                    <tr
                      key={element.id}
                      className="border-t border-zinc-100"
                    >
                      <td className="px-3 py-2">
                        <input
                          value={draft.name}
                          onChange={(e) =>
                            setElementDrafts((prev) => ({
                              ...prev,
                              [element.id]: {
                                ...draft,
                                name: e.target.value,
                              },
                            }))
                          }
                          onBlur={() => handleElementBlur(element.id, "name")}
                          disabled={!canManage}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={draft.type}
                          onChange={(e) => {
                            const type = e.target.value as DesignElementType;
                            setElementDrafts((prev) => ({
                              ...prev,
                              [element.id]: { ...draft, type },
                            }));
                            if (canManage) {
                              void onPatchElement(design.id, element.id, {
                                type,
                              });
                            }
                          }}
                          disabled={!canManage}
                          className={inputClass}
                        >
                          {ELEMENT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          value={draft.qtyPerSet}
                          onChange={(e) =>
                            setElementDrafts((prev) => ({
                              ...prev,
                              [element.id]: {
                                ...draft,
                                qtyPerSet: e.target.value,
                              },
                            }))
                          }
                          onBlur={() =>
                            handleElementBlur(element.id, "qtyPerSet")
                          }
                          disabled={!canManage}
                          className={inputClass}
                        />
                      </td>
                      {canManage && (
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleDeleteElement(element.id)}
                            className="p-1 rounded text-zinc-400 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {design.elements.length === 0 && (
                  <tr>
                    <td
                      colSpan={canManage ? 4 : 3}
                      className="px-3 py-4 text-center text-zinc-400 text-xs"
                    >
                      No elements yet. Add components to the bill of materials.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {canManage && (
            <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-zinc-100">
              <div className="flex-1 min-w-[140px]">
                <input
                  value={newElementName}
                  onChange={(e) => setNewElementName(e.target.value)}
                  className={inputClass}
                  placeholder="Element name"
                />
              </div>
              <select
                value={newElementType}
                onChange={(e) =>
                  setNewElementType(e.target.value as DesignElementType)
                }
                className={`${inputClass} w-28`}
              >
                {ELEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={newElementQty}
                onChange={(e) => setNewElementQty(e.target.value)}
                className={`${inputClass} w-20`}
                placeholder="Qty"
              />
              <button
                onClick={handleAddElement}
                className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
              >
                <Plus size={14} />
                Add Element
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
    patchElement,
    removeElement,
  } = useDesigns();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return designs;
    return designs.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.name?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q),
    );
  }, [designs, search]);

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Design Library"
        subtitle="Jewellery patterns and bill of materials"
        action={
          canManage ? (
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              New Design
            </button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-full max-w-sm px-3 py-2 text-sm"
          placeholder="Search by code, name, or category…"
        />
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="surface-card px-5 py-8 text-center">
          <p className="text-sm text-zinc-400">
            {designs.length === 0
              ? "No designs yet. Create your first jewellery pattern."
              : "No designs match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((design) => (
            <DesignCard
              key={design.id}
              design={design}
              canManage={canManage}
              onPatchDesign={async (id, input) => {
                await patchDesign(id, input);
              }}
              onRemoveDesign={removeDesign}
              onAddElement={async (designId, input) => {
                await addElement(designId, input);
              }}
              onPatchElement={async (designId, elementId, input) => {
                await patchElement(designId, elementId, input);
              }}
              onRemoveElement={async (designId, elementId) => {
                await removeElement(designId, elementId);
              }}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <AddDesignModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={async (input) => {
            await addDesign(input);
          }}
        />
      )}
    </div>
  );
}
