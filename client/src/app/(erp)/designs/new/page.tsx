"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageDesigns } from "@/lib/auth/permissions";
import { useDesigns } from "@/lib/designs/designs-context";
import { advanceDesignBuilder } from "@/lib/api/designs";
import { getApiErrorMessage } from "@/lib/api/client";
import type { DesignCategory, MetalType, Purity } from "@/lib/types";

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

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function NewDesignPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addDesign } = useDesigns();
  const canManage = user ? canManageDesigns(user.role) : false;

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DesignCategory | "">("");
  const [metal, setMetal] = useState<MetalType | "">("");
  const [purity, setPurity] = useState<Purity | "">("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (user && !canManage) router.replace("/designs");
  }, [user, canManage, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code.trim()) {
      setError("Design code is required.");
      return;
    }
    if (!metal || !purity) {
      setError("Metal and purity are required.");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError("");
    try {
      const design = await addDesign({
        code: code.trim().toUpperCase(),
        name: name.trim() || undefined,
        category: category || undefined,
        metal: metal as MetalType,
        purity: purity as Purity,
      });
      try {
        await advanceDesignBuilder(design.id);
      } catch {
        // Non-fatal: design was created, just navigate to CAD
      }
      router.push(`/designs/${design.id}/builder/cad`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create design."));
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (user && !canManage) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href="/designs"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft size={16} />
        Back to designs
      </Link>

      <PageHeader
        title="New Design / SKU"
        subtitle="Step 1 — create the design code and set metal & purity"
      />

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="surface-card p-5 space-y-4">
        <div>
          <label className={labelClass}>Design Code *</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className={fieldClass}
            placeholder="e.g. SLGBNK-184"
            autoFocus
          />
        </div>
        <div>
          <label className={labelClass}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
            placeholder="Optional display name"
          />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DesignCategory | "")}
            className={fieldClass}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Metal *</label>
            <select
              value={metal}
              onChange={(e) => setMetal(e.target.value as MetalType | "")}
              className={fieldClass}
            >
              <option value="">Select metal</option>
              {METALS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Purity *</label>
            <select
              value={purity}
              onChange={(e) => setPurity(e.target.value as Purity | "")}
              className={fieldClass}
            >
              <option value="">Select purity</option>
              {PURITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full px-4 py-2.5 text-sm">
          Next: CAD / Prototype
        </button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        message="Create this design and proceed to CAD / Prototype?"
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmOpen(false)}
        loading={submitting}
      />
    </div>
  );
}
