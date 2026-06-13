"use client";

import StatusBadge from "@/app/(components)/StatusBadge";
import { formatCurrency } from "@/lib/format";
import type { InventoryItem } from "@/lib/types";

type InventoryTableProps = {
  rows: InventoryItem[];
  onRowClick: (item: InventoryItem) => void;
};

export default function InventoryTable({ rows, onRowClick }: InventoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="bg-zinc-50 text-zinc-500">
            <th className="text-left px-5 py-3 font-medium">Product</th>
            <th className="text-left px-5 py-3 font-medium">Category</th>
            <th className="text-left px-5 py-3 font-medium">Metal</th>
            <th className="text-left px-5 py-3 font-medium">Weight</th>
            <th className="text-left px-5 py-3 font-medium">Qty</th>
            <th className="text-left px-5 py-3 font-medium">Price</th>
            <th className="text-left px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-5 py-8 text-center text-sm text-zinc-400"
              >
                No products match your filters.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                tabIndex={0}
                onClick={() => onRowClick(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onRowClick(row);
                  }
                }}
                className="cursor-pointer border-t border-zinc-100 text-zinc-900 outline-none transition-colors hover:bg-zinc-50 focus:bg-zinc-50"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {row.images?.[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.images[0].url}
                        alt={row.name}
                        loading="lazy"
                        className="w-11 h-11 rounded-lg flex-shrink-0 object-cover border"
                        style={{ borderColor: "var(--border)" }}
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: "var(--bg-muted)" }}
                      />
                    )}
                    <div>
                      <p className="font-medium text-[13px]">{row.name}</p>
                      <p className="text-[11px] font-mono text-zinc-400">
                        {row.sku}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">{row.category}</td>
                <td className="px-5 py-3">
                  {row.metal} {row.purity}
                </td>
                <td className="px-5 py-3">{row.weightGrams}g</td>
                <td className="px-5 py-3 font-medium">{row.stock}</td>
                <td className="px-5 py-3">{formatCurrency(row.price)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
