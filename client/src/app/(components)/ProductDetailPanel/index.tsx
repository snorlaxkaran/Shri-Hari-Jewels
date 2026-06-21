"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Pencil, Plus, X } from "lucide-react";
import type { InventoryItem } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteInventory } from "@/lib/auth/permissions";
import { useInventory } from "@/lib/inventory/inventory-context";
import StatusBadge from "@/app/(components)/StatusBadge";

const EditProductModal = dynamic(() => import("@/app/(components)/EditProductModal"), { ssr: false });
const AddUnitsModal = dynamic(() => import("@/app/(components)/AddUnitsModal"), { ssr: false });

type ProductDetailPanelProps = {
  product: InventoryItem | null;
  existingUnitCodes: string[];
  onClose: () => void;
  onUpdated?: (product: InventoryItem) => void;
  onDeleted?: () => void;
};

const unitPriceLabel = (priceSource: InventoryItem["units"][0]["priceSource"]) => {
  if (priceSource === "live") return "Live price";
  if (priceSource === "sold") return "Sold at";
  return "Locked price";
};

export default function ProductDetailPanel({
  product,
  existingUnitCodes,
  onClose,
  onUpdated,
}: ProductDetailPanelProps) {
  const { user } = useAuth();
  const { updateProduct, addQuantityToSku } = useInventory();
  const [editOpen, setEditOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);

  if (!product) return null;

  const canWrite = user ? canWriteInventory(user.role) : false;
  const availableCount = product.units.filter(
    (unit) => unit.status === "Available",
  ).length;
  const soldCount = product.units.filter((unit) => unit.status === "Sold").length;
  const transferredCount = product.units.filter(
    (unit) => unit.status === "Transferred",
  ).length;
  const reservedCount = product.units.filter(
    (unit) => unit.status === "Reserved",
  ).length;
  const hasLivePrice = product.units.some((unit) => unit.priceSource === "live");

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
                [hasLivePrice ? "Live Price" : "Price", formatCurrency(product.price)],
                ["Available", String(availableCount)],
                ["Sold", String(soldCount)],
                ["Transferred", String(transferredCount)],
                ...(reservedCount ? [["Reserved", String(reservedCount)]] : []),
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
                <span className="text-zinc-400 font-normal">
                  {" "}— each piece keeps its own price; sold prices never change
                </span>
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {product.units.map((unit) => (
                  <div
                    key={unit.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs bg-zinc-50"
                  >
                    <div className="min-w-0">
                      <p className="font-mono font-medium text-zinc-800 truncate">
                        {unit.itemCode}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {unitPriceLabel(unit.priceSource)}: {formatCurrency(unit.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {unit.status === "Transferred" && unit.branchName && (
                        <span className="text-[11px] text-zinc-500">
                          to {unit.branchName}
                        </span>
                      )}
                      <StatusBadge status={unit.status} />
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
