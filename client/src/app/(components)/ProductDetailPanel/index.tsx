"use client";

import { X } from "lucide-react";
import type { InventoryItem } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import StatusBadge from "@/app/(components)/StatusBadge";

type ProductDetailPanelProps = {
  product: InventoryItem | null;
  onClose: () => void;
};

export default function ProductDetailPanel({
  product,
  onClose,
}: ProductDetailPanelProps) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md h-full overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 sticky top-0 bg-white">
          <div>
            <p className="font-mono text-xs text-zinc-400">{product.sku}</p>
            <h2 className="text-base font-semibold text-zinc-900">
              {product.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
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
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                  {index === 0 && (
                    <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-900 text-white">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <StatusBadge status={product.status} />
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
              {product.category}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Metal", `${product.metal} ${product.purity}`],
              ["Weight", `${product.weightGrams}g`],
              ["Making Charges", formatCurrency(product.makingCharges)],
              ["Price", formatCurrency(product.price)],
              ["Stock", String(product.stock)],
              ...(product.stoneCarat
                ? [["Stone", `${product.stoneCarat} ct`]]
                : []),
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
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {product.units.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs bg-zinc-50"
                >
                  <span className="font-mono font-medium text-zinc-800">
                    {unit.itemCode}
                  </span>
                  <StatusBadge status={unit.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
