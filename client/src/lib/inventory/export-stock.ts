import type { InventoryItem } from "@/lib/types";
import type { InventoryUnitRow } from "./unit-rows";

const csvCell = (value: string | number | null | undefined) => {
  const text = value == null || value === "" ? "-" : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

const formatDateForFilename = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

const downloadCsv = (filename: string, headers: string[], rows: string[]) => {
  const csv = [headers.map(csvCell).join(","), ...rows].join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadUnitStockExcel = (rows: InventoryUnitRow[]) => {
  const headers = [
    "Item Code",
    "Product",
    "SKU",
    "Category",
    "Metal",
    "Purity",
    "Weight (g)",
    "Price",
    "Making Charges",
    "Status",
    "Location",
    "Created Date",
  ];

  const csvRows = rows.map((row) =>
    [
      row.itemCode,
      row.name,
      row.sku,
      row.category,
      row.metal,
      row.purity,
      row.weightGrams,
      row.price,
      row.makingCharges,
      row.status,
      row.branchName,
      new Date(row.createdAt).toLocaleDateString("en-IN"),
    ]
      .map(csvCell)
      .join(","),
  );

  downloadCsv(`stock-${formatDateForFilename()}.csv`, headers, csvRows);
};

/** @deprecated Use downloadUnitStockExcel for item-level exports. */
export const downloadStockExcel = (items: InventoryItem[]) => {
  const headers = [
    "Item Code",
    "Product",
    "SKU",
    "Category",
    "Metal",
    "Purity",
    "Weight (g)",
    "Stone (ct)",
    "Price",
    "Making Charges",
    "Status",
    "Created Date",
  ];

  const rows = items.flatMap((item) => {
    const units = item.units.length > 0 ? item.units : [null];

    return units.map((unit) =>
      [
        unit?.itemCode,
        item.name,
        item.sku,
        item.category,
        item.metal,
        item.purity,
        item.weightGrams,
        item.stoneCarat ?? 0,
        item.price,
        item.makingCharges,
        unit?.status ?? item.status,
        unit?.createdAt
          ? new Date(unit.createdAt).toLocaleDateString("en-IN")
          : new Date(item.createdAt).toLocaleDateString("en-IN"),
      ]
        .map(csvCell)
        .join(","),
    );
  });

  downloadCsv(`stock-${formatDateForFilename()}.csv`, headers, rows);
};
