"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageMotifs } from "@/lib/auth/permissions";
import {
  createBulkStoneLot,
  deleteBulkStoneLot,
  fetchBulkStoneLots,
  updateBulkStoneLot,
} from "@/lib/api/bulk-stone-lots";
import { MOTIF_STONE_TYPES } from "@/lib/motifs/constants";
import type {
  BulkStoneLot,
  MotifStoneType,
  NewBulkStoneLotInput,
} from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function BulkStoneLotsPage() {
  const { user } = useAuth();
  const canManage = user ? canManageMotifs(user.role) : false;

  const [lots, setLots] = useState<BulkStoneLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [sizeLabel, setSizeLabel] = useState("");
  const [stoneType, setStoneType] = useState<MotifStoneType>("Zircon");
  const [quantity, setQuantity] = useState("");
  const [pricePerStone, setPricePerStone] = useState("");
  const [vendor, setVendor] = useState("");
  const [lotReference, setLotReference] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [location, setLocation] = useState("Main Vault");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadLots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLots(await fetchBulkStoneLots());
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load bulk stone lots."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLots();
  }, [loadLots]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lots;
    return lots.filter(
      (l) =>
        l.sizeLabel.toLowerCase().includes(q) ||
        l.stoneType.toLowerCase().includes(q) ||
        l.vendor?.toLowerCase().includes(q),
    );
  }, [lots, search]);

  const resetForm = () => {
    setSizeLabel("");
    setStoneType("Zircon");
    setQuantity("");
    setPricePerStone("");
    setVendor("");
    setLotReference("");
    setPurchaseDate("");
    setLocation("Main Vault");
    setFormError("");
  };

  const buildInput = (): NewBulkStoneLotInput => ({
    sizeLabel: sizeLabel.trim(),
    stoneType,
    quantity: parseInt(quantity, 10),
    pricePerStone: parseFloat(pricePerStone),
    vendor: vendor.trim() || undefined,
    lotReference: lotReference.trim() || undefined,
    purchaseDate: purchaseDate || undefined,
    location: location.trim() || "Main Vault",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setFormError("");

    if (!sizeLabel.trim()) {
      setFormError("Size label is required.");
      return;
    }
    const qty = parseInt(quantity, 10);
    const price = parseFloat(pricePerStone);
    if (!Number.isFinite(qty) || qty < 0) {
      setFormError("Enter a valid quantity.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError("Enter a valid price per stone.");
      return;
    }

    setSubmitting(true);
    try {
      const lot = await createBulkStoneLot(buildInput());
      setLots((prev) =>
        [...prev, lot].sort((a, b) => a.sizeLabel.localeCompare(b.sizeLabel)),
      );
      resetForm();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to create lot."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this bulk stone lot?")) return;
    try {
      await deleteBulkStoneLot(id);
      setLots((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete lot."));
    }
  };

  const handleAdjustQty = async (lot: BulkStoneLot, delta: number) => {
    if (!canManage) return;
    const next = lot.quantity + delta;
    if (next < 0) return;
    try {
      const updated = await updateBulkStoneLot(lot.id, { quantity: next });
      setLots((prev) => prev.map((l) => (l.id === lot.id ? updated : l)));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update quantity."));
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bulk Stone Lots"
        subtitle="Sized bulk stones by count — master inventory for motif stone pricing"
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
          <h2 className="text-base font-semibold text-zinc-900">Add bulk stone lot</h2>

          <div>
            <label className={labelClass}>Size label *</label>
            <input
              value={sizeLabel}
              onChange={(e) => setSizeLabel(e.target.value)}
              className={fieldClass}
              placeholder='e.g. Pear 10x8, 6mm Round'
              disabled={!canManage}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Stone type</label>
              <select
                value={stoneType}
                onChange={(e) => setStoneType(e.target.value as MotifStoneType)}
                className={fieldClass}
                disabled={!canManage}
              >
                {MOTIF_STONE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={fieldClass}
                disabled={!canManage}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Quantity (count) *</label>
              <input
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={fieldClass}
                disabled={!canManage}
              />
            </div>
            <div>
              <label className={labelClass}>Price per stone (₹) *</label>
              <input
                type="number"
                min={0}
                step={0.0001}
                value={pricePerStone}
                onChange={(e) => setPricePerStone(e.target.value)}
                className={fieldClass}
                disabled={!canManage}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Vendor</label>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className={fieldClass}
                disabled={!canManage}
              />
            </div>
            <div>
              <label className={labelClass}>Lot reference</label>
              <input
                value={lotReference}
                onChange={(e) => setLotReference(e.target.value)}
                className={fieldClass}
                disabled={!canManage}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Purchase date</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className={fieldClass}
              disabled={!canManage}
            />
          </div>

          {formError && <p className="text-xs text-red-500">{formError}</p>}

          {canManage && (
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5 text-sm"
            >
              {submitting ? "Saving…" : "Save lot"}
            </button>
          )}
        </form>

        <div className="surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-900">On-hand lots</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field px-3 py-1.5 text-sm max-w-xs"
              placeholder="Search…"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">No lots yet.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((lot) => (
                <div
                  key={lot.id}
                  className="border border-zinc-100 rounded-lg p-4 flex flex-wrap gap-4 justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{lot.sizeLabel}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {lot.stoneType} · ₹{lot.pricePerStone}/pc · {lot.location}
                    </p>
                    {lot.vendor && (
                      <p className="text-xs text-zinc-400 mt-0.5">{lot.vendor}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {lot.quantity} pcs
                    </span>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleAdjustQty(lot, -1)}
                          className="btn-secondary px-2 py-1 text-xs"
                        >
                          −1
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleAdjustQty(lot, 1)}
                          className="btn-secondary px-2 py-1 text-xs"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(lot.id)}
                          className="p-2 text-zinc-400 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
