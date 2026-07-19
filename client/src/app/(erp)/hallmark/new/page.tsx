"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, Trash2 } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ItemCodeLink from "@/app/(components)/inventory/ItemCodeLink";
import { fetchBranches } from "@/lib/api/branches";
import { createHallmarkBatch } from "@/lib/api/hallmark";
import { fetchInventory } from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Branch, InventoryItem } from "@/lib/types";

type ScannedUnit = {
  unitId: string;
  itemCode: string;
  productName: string;
  sku: string;
  metal: string;
  purity: string;
  weightGrams: number;
};

export default function NewHallmarkBatchPage() {
  const router = useRouter();
  const scanRef = useRef<HTMLInputElement>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [branchId, setBranchId] = useState("");
  const [hallmarkCenter, setHallmarkCenter] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [scanned, setScanned] = useState<ScannedUnit[]>([]);
  const [scanError, setScanError] = useState("");
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

  const findUnitInBranch = (code: string) => {
    const needle = code.trim().toLowerCase();
    for (const product of items) {
      for (const unit of product.units) {
        if (
          unit.itemCode.toLowerCase() === needle &&
          unit.branchId === branchId
        ) {
          return { unit, product };
        }
      }
    }
    return null;
  };

  const addScannedItem = () => {
    const code = scanCode.trim();
    if (!code) return;

    setScanError("");
    setError("");

    if (
      scanned.some((item) => item.itemCode.toLowerCase() === code.toLowerCase())
    ) {
      setScanError("This item is already scanned.");
      return;
    }

    const match = findUnitInBranch(code);
    if (!match) {
      setScanError("Item code not found in this branch.");
      return;
    }

    const { unit, product } = match;

    if (unit.status !== "Available") {
      setScanError(`This item is ${unit.status} and cannot be hallmarked.`);
      return;
    }

    if (!unit.hallmarkPending) {
      setScanError(
        "This item is already hallmarked or does not require BIS hallmark.",
      );
      return;
    }

    setScanned((prev) => [
      ...prev,
      {
        unitId: unit.id,
        itemCode: unit.itemCode,
        productName: product.name,
        sku: product.sku,
        metal: product.metal,
        purity: product.purity,
        weightGrams: product.weightGrams,
      },
    ]);
    setScanCode("");
    scanRef.current?.focus();
  };

  const removeScannedItem = (itemCode: string) => {
    setScanned((prev) => prev.filter((item) => item.itemCode !== itemCode));
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
    if (scanned.length === 0) {
      setError("Scan at least one item.");
      return;
    }

    setSubmitting(true);
    try {
      const batch = await createHallmarkBatch({
        branchId,
        hallmarkCenter: hallmarkCenter.trim(),
        inventoryUnitIds: scanned.map((item) => item.unitId),
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
        subtitle="Scan each piece to add it to the batch before sending to a BIS center"
      />

      {(error || scanError) && (
        <div className="px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error || scanError}
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
              setScanned([]);
              setScanError("");
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
          <label className="text-xs block mb-1 text-zinc-500 font-medium">
            Scan item barcode
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                ref={scanRef}
                type="text"
                value={scanCode}
                onChange={(e) => {
                  setScanCode(e.target.value);
                  setScanError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addScannedItem();
                  }
                }}
                placeholder="Scan or type item code, then press Enter"
                className="input-field w-full pl-9 pr-4 py-2 text-sm font-mono"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={addScannedItem}
              disabled={!scanCode.trim()}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-1.5">
            {pendingUnits.length} item{pendingUnits.length === 1 ? "" : "s"} in
            this branch still need hallmarking.
          </p>
        </div>

        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-zinc-800">
              Scanned items ({scanned.length})
            </p>
          </div>
          {scanned.length === 0 ? (
            <p className="px-4 py-8 text-sm text-center text-zinc-400">
              Scan barcode tags to add pieces to this hallmark batch.
            </p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {scanned.map((unit) => (
                <div
                  key={unit.unitId}
                  className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <ItemCodeLink
                      itemCode={unit.itemCode}
                      className="font-mono text-xs"
                    />
                    <p className="text-zinc-700">{unit.productName}</p>
                    <p className="text-xs text-zinc-400">
                      {unit.metal} {unit.purity} · {unit.weightGrams}g ·{" "}
                      {unit.sku}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeScannedItem(unit.itemCode)}
                    className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50"
                    aria-label={`Remove ${unit.itemCode}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={submitting || scanned.length === 0}
          onClick={() => void handleCreate()}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {submitting
            ? "Creating…"
            : `Create batch (${scanned.length} item${scanned.length === 1 ? "" : "s"})`}
        </button>
      </div>
    </div>
  );
}
