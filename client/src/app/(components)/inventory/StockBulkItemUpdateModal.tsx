"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import BulkUpdateCard from "@/app/(components)/settings/BulkUpdateCard";
import { bulkUpdateInventoryItems } from "@/lib/api/inventory";
import {
  ITEM_UPDATE_HEADERS,
  mapItemUpdateRows,
} from "@/lib/inventory/bulk-updates";

type StockBulkItemUpdateModalProps = {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
};

export default function StockBulkItemUpdateModal({
  open,
  onClose,
  onComplete,
}: StockBulkItemUpdateModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div
        className="relative w-full max-w-3xl rounded-xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-bulk-item-update-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="p-5 sm:p-6">
          <BulkUpdateCard
            title="Bulk update items from Excel"
            description="One row per item code. Leave a column blank to keep that field unchanged. Price and cost apply to the piece; weight and description apply to the SKU it ends up under. Sold pieces are skipped. Item codes are never changed."
            headers={ITEM_UPDATE_HEADERS}
            sampleRow={[
              "SMNK0011-003",
              "SMNK0012",
              "45000",
              "32000",
              "12.5",
              "Classic gold necklace",
            ]}
            templateFileName="item-update-template"
            columns={[
              { label: "Item code", value: (row) => row.itemCode },
              { label: "SKU", value: (row) => row.newSku ?? "—" },
              { label: "Price", value: (row) => row.newPrice?.toString() ?? "—" },
              { label: "Cost", value: (row) => row.newCost?.toString() ?? "—" },
              { label: "Weight (g)", value: (row) => row.newWeight?.toString() ?? "—" },
              {
                label: "Description",
                value: (row) => row.newDescription ?? "—",
              },
            ]}
            parse={mapItemUpdateRows}
            onApply={async (rows) => {
              const result = await bulkUpdateInventoryItems(rows);
              if (result.updated > 0) onComplete?.();
              return result;
            }}
            applyLabel="Apply item updates"
          />
        </div>
      </div>
    </div>
  );
}
