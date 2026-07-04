import PDFDocument from "pdfkit";
import type {
  Customer,
  CustomerBranch,
  StockTransferItem as DbStockTransferItem,
  StockTransfer as DbStockTransfer,
} from "@prisma/client";
import type { ShopSettings } from "../../types.js";
import { drawDocumentHeader } from "../pdf/document-header.js";
import { amountInIndianWords, formatDateIn, formatRupee } from "../pdf/format.js";
import {
  drawBorderedTable,
  drawLabelValueBox,
  ensureSpace,
  getContentWidth,
} from "../pdf/table.js";
import { moneyToNumber, sumMoney } from "../money.js";

type TransferForPdf = DbStockTransfer & {
  customer?: Pick<Customer, "name"> | null;
  customerBranch?: Pick<CustomerBranch, "name"> | null;
  items: DbStockTransferItem[];
};

type JewelryGroupKey = "Gold Jewelry" | "Silver Jewelry" | "Imitation Jewelry";

const resolveJewelryGroup = (metal: string): JewelryGroupKey => {
  if (metal === "Gold" || metal === "Rose Gold") return "Gold Jewelry";
  if (metal === "Silver" || metal === "Platinum") return "Silver Jewelry";
  return "Imitation Jewelry";
};

const GROUP_ORDER: JewelryGroupKey[] = [
  "Gold Jewelry",
  "Silver Jewelry",
  "Imitation Jewelry",
];

export const generateTransferInvoicePdf = (
  transfer: TransferForPdf,
  settings: ShopSettings,
  shopState: string,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const isInvoice = transfer.documentType === "Wholesale GST Invoice";
    const docTitle = isInvoice ? "WHOLESALE GST INVOICE" : "DELIVERY CHALLAN";

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const contentWidth = getContentWidth(doc);

    drawDocumentHeader(doc, settings, docTitle);

    const infoTop = doc.y;
    const columnGap = 12;
    const leftColWidth = contentWidth * 0.58;
    const rightColWidth = contentWidth - leftColWidth - columnGap;

    const billToLines: string[] = [];
    if (transfer.customer?.name) billToLines.push(transfer.customer.name);
    if (transfer.customerBranch?.name) {
      billToLines.push(transfer.customerBranch.name);
    }
    if (transfer.recipientAddress?.trim()) {
      billToLines.push(transfer.recipientAddress.trim());
    }
    if (transfer.recipientGstNumber?.trim()) {
      billToLines.push(`GSTIN: ${transfer.recipientGstNumber.trim()}`);
    }
    if (transfer.recipientPanNumber?.trim()) {
      billToLines.push(`PAN: ${transfer.recipientPanNumber.trim()}`);
    }
    const contactParts = [
      transfer.contactPersonName?.trim(),
      transfer.contactPersonPhone?.trim(),
    ].filter(Boolean);
    if (contactParts.length > 0) {
      billToLines.push(`Contact: ${contactParts.join(" — ")}`);
    }

    const billToBottom = drawLabelValueBox(
      doc,
      left,
      infoTop,
      leftColWidth,
      "Bill To",
      billToLines.length > 0 ? billToLines : ["—"],
    );

    const docNo = isInvoice
      ? (transfer.invoiceNo ?? transfer.transferNo)
      : transfer.transferNo;
    const docNoLabel = isInvoice ? "Invoice No" : "Challan No";
    const displayDate = transfer.dispatchDate ?? transfer.transferDate;

    const shipmentLines = [
      `${docNoLabel}: ${docNo}`,
      `Transfer No: ${transfer.transferNo}`,
      `Date: ${formatDateIn(displayDate.toISOString())}`,
      `Courier: ${transfer.courierCompany?.trim() || "—"}`,
      `Place of Supply: ${transfer.placeOfSupplyState?.trim() || "—"}`,
    ];

    const shipmentBottom = drawLabelValueBox(
      doc,
      left + leftColWidth + columnGap,
      infoTop,
      rightColWidth,
      "Shipment Details",
      shipmentLines,
    );

    doc.y = Math.max(billToBottom, shipmentBottom) + 14;

    ensureSpace(doc, 120);
    const itemTableTop = doc.y;
    const colSr = contentWidth * 0.05;
    const colDesc = contentWidth * 0.28;
    const colPieces = contentWidth * 0.1;
    const colWeight = contentWidth * 0.17;
    const colRate = contentWidth * 0.14;
    const colAmount =
      contentWidth - colSr - colDesc - colPieces - colWeight - colRate;

    const grouped = new Map<
      JewelryGroupKey,
      { pieces: number; weight: number; amount: number }
    >();
    for (const key of GROUP_ORDER) {
      grouped.set(key, { pieces: 0, weight: 0, amount: 0 });
    }

    for (const item of transfer.items) {
      const key = resolveJewelryGroup(item.metal);
      const entry = grouped.get(key)!;
      entry.pieces += 1;
      entry.weight += item.weightGrams ? moneyToNumber(item.weightGrams) : 0;
      entry.amount += moneyToNumber(item.price);
    }

    const totalPieces = transfer.items.length;
    const totalWeight = transfer.items.reduce(
      (sum, item) => sum + (item.weightGrams ? moneyToNumber(item.weightGrams) : 0),
      0,
    );
    const totalAmount = moneyToNumber(
      sumMoney(transfer.items.map((item) => item.price)),
    );

    const itemRows: Parameters<typeof drawBorderedTable>[4] = [
      {
        cells: ["#", "Description", "Pieces", "Net Weight (g)", "Rate", "Amount"],
        bold: true,
        alignments: ["center", "left", "center", "right", "right", "right"] as const,
        minHeight: 24,
      },
    ];

    let rowNum = 1;
    for (const groupName of GROUP_ORDER) {
      const group = grouped.get(groupName)!;
      if (group.pieces === 0) continue;
      itemRows.push({
        cells: [
          String(rowNum),
          groupName,
          String(group.pieces),
          `${group.weight.toFixed(3)} g`,
          "",
          formatRupee(group.amount),
        ],
        alignments: ["center", "left", "center", "right", "right", "right"] as const,
        minHeight: 24,
      });
      rowNum += 1;
    }

    itemRows.push({
      cells: [
        "",
        "Total",
        String(totalPieces),
        `${totalWeight.toFixed(3)} g`,
        "",
        formatRupee(totalAmount),
      ],
      bold: true,
      alignments: ["center", "left", "center", "right", "right", "right"] as const,
      minHeight: 26,
    });

    const itemTableBottom = drawBorderedTable(
      doc,
      left,
      itemTableTop,
      [colSr, colDesc, colPieces, colWeight, colRate, colAmount],
      itemRows,
      { headerRowCount: 1, defaultFontSize: 9, headerFontSize: 9 },
    );

    doc.y = itemTableBottom + 10;

    const totalsWidth = contentWidth * 0.42;
    const totalsX = left + contentWidth - totalsWidth;
    const totalsTop = doc.y;

    const supplyState = transfer.placeOfSupplyState?.trim().toLowerCase() ?? "";
    const sellerState = shopState.trim().toLowerCase();
    const isIntraState = supplyState.length > 0 && supplyState === sellerState;

    const totalsRows: Parameters<typeof drawBorderedTable>[4] = [
      {
        cells: ["Subtotal (excl. GST)", formatRupee(totalAmount)],
        alignments: ["left", "right"] as const,
      },
    ];

    let grandTotal = totalAmount;

    if (isInvoice) {
      if (isIntraState) {
        const cgst = totalAmount * 0.015;
        const sgst = totalAmount * 0.015;
        grandTotal = totalAmount + cgst + sgst;
        totalsRows.push({
          cells: ["CGST @ 1.5%", formatRupee(cgst)],
          alignments: ["left", "right"] as const,
        });
        totalsRows.push({
          cells: ["SGST @ 1.5%", formatRupee(sgst)],
          alignments: ["left", "right"] as const,
        });
      } else {
        const igst = totalAmount * 0.03;
        grandTotal = totalAmount + igst;
        totalsRows.push({
          cells: ["IGST @ 3%", formatRupee(igst)],
          alignments: ["left", "right"] as const,
        });
      }
    } else {
      totalsRows[0] = {
        cells: ["Subtotal", formatRupee(totalAmount)],
        alignments: ["left", "right"] as const,
      };
    }

    totalsRows.push({
      cells: ["Grand Total", formatRupee(grandTotal)],
      bold: true,
      alignments: ["left", "right"] as const,
      minHeight: 26,
    });

    const totalsBottom = drawBorderedTable(
      doc,
      totalsX,
      totalsTop,
      [totalsWidth * 0.55, totalsWidth * 0.45],
      totalsRows,
      { defaultFontSize: 9, defaultRowHeight: 22 },
    );

    doc.y = totalsBottom + 8;
    doc.font("Helvetica").fontSize(9).fillColor("#374151");
    doc.text(`Amount in words: ${amountInIndianWords(grandTotal)}`, left, doc.y, {
      width: contentWidth,
    });
    doc.y += 18;

    if (!isInvoice) {
      ensureSpace(doc, 30);
      doc.font("Helvetica").fontSize(9).fillColor("#374151");
      doc.text(
        "This is a Delivery Challan only. No tax is applicable on this document.",
        left,
        doc.y,
        { width: contentWidth },
      );
      doc.y += 16;
    }

    ensureSpace(doc, 80);
    const dispatchLines = [
      `Dispatched via: ${transfer.courierCompany?.trim() || "—"}`,
      `Contact Person: ${transfer.contactPersonName?.trim() || "—"} — ${transfer.contactPersonPhone?.trim() || "—"}`,
      `Dispatch Date: ${formatDateIn(transfer.dispatchDate?.toISOString() ?? transfer.transferDate.toISOString())}`,
      `Total Pieces: ${totalPieces}   |   Total Net Weight: ${totalWeight.toFixed(3)}g`,
    ];
    doc.y =
      drawLabelValueBox(doc, left, doc.y, contentWidth, "Dispatch", dispatchLines) +
      12;

    ensureSpace(doc, 40);
    doc.font("Helvetica").fontSize(8).fillColor("#6b7280");
    doc.text(
      "This is a computer-generated document. E. & O.E.",
      left,
      doc.y,
      { width: contentWidth, align: "center" },
    );

    doc.end();
  });
