"use client";

import type { ProductionRunItem } from "@/lib/types";
import { formatElementWeight } from "@/lib/production-runs/item-helpers";

type ProductionRunElementCardProps = {
  item: ProductionRunItem;
  index: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
  done?: boolean;
};

export default function ProductionRunElementCard({
  item,
  index,
  children,
  footer,
  done = false,
}: ProductionRunElementCardProps) {
  return (
    <article
      className={`surface-card overflow-hidden border ${
        done ? "border-emerald-200 bg-emerald-50/30" : "border-zinc-200"
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr]">
        <div className="bg-zinc-50 border-b md:border-b-0 md:border-r border-zinc-200 p-3">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.elementName}
              className="w-full aspect-square object-contain rounded-lg bg-white border border-zinc-200"
            />
          ) : (
            <div className="w-full aspect-square rounded-lg bg-white border border-dashed border-zinc-300 flex items-center justify-center text-xs text-zinc-400 text-center px-3">
              No motif image
            </div>
          )}
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-2">
            Motif #{index + 1}
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-zinc-900">{item.elementName}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{item.elementType}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                {item.qtyPerSet}/set · {item.totalQty} total
              </span>
              <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                {formatElementWeight(item)}
              </span>
              {done && (
                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  Done
                </span>
              )}
            </div>
          </div>

          {children}
          {footer}
        </div>
      </div>
    </article>
  );
}
