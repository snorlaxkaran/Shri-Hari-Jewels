"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { InventoryItem } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canDeleteProduct,
  canWriteInventory,
} from "@/lib/auth/permissions";
import { useInventory } from "@/lib/inventory/inventory-context";
import StatusBadge from "@/app/(components)/StatusBadge";
import { getApiErrorMessage } from "@/lib/api/client";

const EditProductModal = dynamic(() => import("@/app/(components)/EditProductModal"), { ssr: false });
const AddUnitsModal = dynamic(() => import("@/app/(components)/AddUnitsModal"), { ssr: false });

type ProductDetailPanelProps = {
  product: InventoryItem | null;
  existingUnitCodes: string[];
  onClose: () => void;
  onUpdated?: (product: InventoryItem) => void;
  onDeleted?: () => void;
};

export default function ProductDetailPanel({
  product,
  existingUnitCodes,
  onClose,
  onUpdated,
  onDeleted,
}: ProductDetailPanelProps) {
  const { user } = useAuth();
  const { updateProduct, deleteProduct, addQuantityToSku, removeUnit } =
    useInventory();
  const [editOpen, setEditOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [removingUnitId, setRemovingUnitId] = useState<string | null>(null);

  if (!product) return null;

  const canWrite = user ? canWriteInventory(user.role) : false;
  const canDelete = user ? canDeleteProduct(user.role) : false;

  const handleRemoveUnit = async (unitId: string, itemCode: string) => {
    if (
      !confirm(
        `Remove unit ${itemCode}? Stock count will decrease by 1. This cannot be undone.`,
      )
    ) {
      return;
    }
    setRemovingUnitId(unitId);
    setError("");
    try {
      const updated = await removeUnit(unitId);
      onUpdated?.(updated);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to remove unit."));
    } finally {
      setRemovingUnitId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${product.name} (${product.sku})? This cannot be undone.`)) return;
    setDeleting(true);
    setError("");
    try {
      await deleteProduct(product.id);
      onDeleted?.();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete product."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
        <div className="relative w-full max-w-md h-full overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 sticky top-0 bg-white">
            <div>
              <p className="font-mono text-xs text-zinc-400">{product.sku}</p>
              <h2 className="text-base font-semibold text-zinc-900">{product.name}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            {canWrite && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="btn-secondary flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setUnitsOpen(true)}
                  className="btn-secondary flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs"
                >
                  <Plus size={14} /> Add Units
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}

            {product.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {product.images.map((img, index) => (
                  <div
                    key={img.id}
                    className={`relative rounded-lg overflow-hidden border border-zinc-200 ${
                      index === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <StatusBadge status={product.status} />
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{product.category}</span>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Metal", `${product.metal} ${product.purity}`],
                ["Weight", `${product.weightGrams}g`],
                ["Making Charges", formatCurrency(product.makingCharges)],
                ["Price", formatCurrency(product.price)],
                ["Stock", String(product.stock)],
                ...(product.stoneCarat ? [["Stone", `${product.stoneCarat} ct`]] : []),
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-zinc-400">{label}</dt>
                  <dd className="font-medium text-zinc-900">{value}</dd>
                </div>
              ))}
            </dl>

            <div>
              <p className="text-xs font-medium mb-2 text-zinc-500">
                Units ({product.units.length})
                {canWrite && (
                  <span className="text-zinc-400 font-normal">
                    {" "}— remove Available units to fix wrong quantity
                  </span>
                )}
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {product.units.map((unit) => (
                  <div
                    key={unit.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs bg-zinc-50"
                  >
                    <span className="font-mono font-medium text-zinc-800">
                      {unit.itemCode}
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={unit.status} />
                      {canWrite && unit.status === "Available" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUnit(unit.id, unit.itemCode)}
                          disabled={removingUnitId === unit.id}
                          className="p-1 rounded text-zinc-400 hover:text-red-600 disabled:opacity-50"
                          aria-label={`Remove ${unit.itemCode}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <EditProductModal
          open={editOpen}
          product={product}
          onClose={() => setEditOpen(false)}
          onSubmit={async (input) => {
            const updated = await updateProduct(product.id, input);
            onUpdated?.(updated);
          }}
        />
      )}

      {unitsOpen && (
        <AddUnitsModal
          open={unitsOpen}
          product={product}
          existingUnitCodes={existingUnitCodes}
          onClose={() => setUnitsOpen(false)}
          onSubmit={async (quantity) => {
            const updated = await addQuantityToSku(product.sku, quantity);
            if (updated) onUpdated?.(updated);
          }}
        />
      )}
    </>
  );
}
