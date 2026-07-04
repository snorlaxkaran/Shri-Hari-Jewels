import type { StockTransfer } from "@/lib/types";

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

const transferItemRows = (transfer: StockTransfer) =>
  transfer.items.map((item) =>
    [
      transfer.transferNo,
      new Date(transfer.transferDate).toLocaleDateString("en-IN"),
      transfer.toBranchName,
      transfer.documentType,
      transfer.recipientGstNumber,
      transfer.recipientPanNumber,
      transfer.recipientAddress,
      transfer.placeOfSupplyState,
      transfer.placeOfSupplyStateCode,
      transfer.placeOfDeliveryState,
      transfer.placeOfDeliveryStateCode,
      item.itemCode,
      item.productName,
      item.sku,
      item.metal,
      item.purity,
      item.price,
    ]
      .map(csvCell)
      .join(","),
  );

const TRANSFER_CSV_HEADERS = [
  "Transfer No",
  "Transfer Date",
  "To Store",
  "Document Type",
  "Recipient GSTN",
  "Recipient PAN",
  "Recipient Address",
  "Place of Supply",
  "POS State Code",
  "Place of Delivery",
  "POD State Code",
  "Item Code",
  "Product",
  "SKU",
  "Metal",
  "Purity",
  "Price",
];

const downloadCsv = (filename: string, rows: string[]) => {
  const csv = [TRANSFER_CSV_HEADERS.map(csvCell).join(","), ...rows].join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadTransferCsv = (transfer: StockTransfer) => {
  const safeNo = transfer.transferNo.replace(/[^\w-]+/g, "_");
  downloadCsv(`transfer-${safeNo}.csv`, transferItemRows(transfer));
};

export const downloadTransfersCsv = (transfers: StockTransfer[]) => {
  const rows = transfers.flatMap(transferItemRows);
  downloadCsv(`sent-stock-${formatDateForFilename()}.csv`, rows);
};
