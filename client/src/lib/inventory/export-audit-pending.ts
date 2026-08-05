import { exportToExcel } from "@/lib/reports/excel";
import type { StockAuditPendingItem } from "@/lib/types";

const AUDIT_PENDING_HEADERS = [
  "Item Code",
  "Product",
  "SKU",
  "Category",
  "Metal",
  "Purity",
  "Weight (g)",
  "Status",
] as const;

export const exportAuditPendingExcel = (
  items: StockAuditPendingItem[],
  metalLabel: string,
): void => {
  const date = new Date().toISOString().slice(0, 10);
  const rows = items.map((item) => [
    item.itemCode,
    item.productName,
    item.sku,
    item.category,
    item.metal,
    item.purity,
    item.weightGrams,
    item.status,
  ]);

  exportToExcel(
    `audit-pending-${metalLabel.toLowerCase().replace(/\s+/g, "-")}-${date}`,
    [...AUDIT_PENDING_HEADERS],
    rows,
  );
};
