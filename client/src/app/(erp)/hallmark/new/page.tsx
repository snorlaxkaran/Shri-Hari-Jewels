"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { fetchBranches } from "@/lib/api/branches";
import { createHallmarkBatch } from "@/lib/api/hallmark";
import { fetchInventory } from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Branch, InventoryItem } from "@/lib/types";

export default function NewHallmarkBatchPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [branchId, setBranchId] = useState("");
  const [hallmarkCenter, setHallmarkCenter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchBranches(), fetchInventory({ hallmarkStatus: "missing" })])
      .then(([branchRows, inventory]) => {
        setBranches(branchRows.filter((b) => b.active));
        setItems(inventory);
        setBranchId(branchRows.find((b) => b.active)?.id ?? "");
      })
      .catch((err) =>
        setError(getApiErrorMessage(err, "Could not load stock for hallmarking.")),
      )
      .finally(() => setLoading(false));
  }, []);

  const pendingUnits = useMemo(() => {
    return items.flatMap((product) =>
      product.units
        .filter((unit) => unit.hallmarkPending && unit.branchId === branchId)
        .map((unit) => ({
          unitId: unit.id,
          itemCode: unit.itemCode,
          productName: product.name,
          sku: product.sku,
          metal: product.metal,
          purity: product.purity,
          weightGrams: product.weightGrams,
        })),
    );
  }, [items, branchId]);

  const toggleUnit = (unitId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const handleCreate = async () => {
    setError("");
    if (!branchId) {
      setError("Select a branch.");
      return;
    }
    if (!hallmarkCenter.trim()) {
      setError("Enter the hallmark center name.");
      return;
    }
    if (selected.size === 0) {
      setError("Select at least one item.");
      return;
    }

    setSubmitting(true);
    try {
      const batch = await createHallmarkBatch({
        branchId,
        hallmarkCenter: hallmarkCenter.trim(),
        inventoryUnitIds: [...selected],
      });
      router.push(`/hallmark/${batch.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create batch."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content space-y-4">
      <Link href="/hallmark" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← Back to hallmark batches
      </Link>

      <PageHeader
        title="New Hallmark Batch"
        subtitle="Select un-hallmarked gold pieces to send to a BIS center"
      />

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="surface-card p-5 space-y-4 max-w-3xl">
        <div>
          <label className="text-xs block mb-1 text-zinc-500 font-medium">
            Branch
          </label>
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setSelected(new Set());
            }}
            className="input-field w-full px-3 py-2 text-sm"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs block mb-1 text-zinc-500 font-medium">
            Hallmark center
          </label>
          <input
            value={hallmarkCenter}
            onChange={(e) => setHallmarkCenter(e.target.value)}
            placeholder="e.g. Mumbai BIS Assaying Centre"
            className="input-field w-full px-3 py-2 text-sm"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-800 mb-2">
            Pending items ({pendingUnits.length})
          </p>
          {pendingUnits.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No hallmark-pending items in this branch.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-zinc-200 rounded-lg divide-y divide-zinc-100">
              {pendingUnits.map((unit) => (
                <label
                  key={unit.unitId}
                  className="flex items-start gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(unit.unitId)}
                    onChange={() => toggleUnit(unit.unitId)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-mono text-xs">{unit.itemCode}</span>
                    <span className="block text-zinc-700">{unit.productName}</span>
                    <span className="text-xs text-zinc-400">
                      {unit.metal} {unit.purity} · {unit.weightGrams}g
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={submitting || selected.size === 0}
          onClick={() => void handleCreate()}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {submitting
            ? "Creating…"
            : `Create batch (${selected.size} item${selected.size === 1 ? "" : "s"})`}
        </button>
      </div>
    </div>
  );
}
