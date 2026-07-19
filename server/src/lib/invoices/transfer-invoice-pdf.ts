import PDFDocument from "pdfkit";
import type {
  Customer,
  CustomerBranch,
  StockTransferItem as DbStockTransferItem,
  StockTransfer as DbStockTransfer,
} from "@prisma/client";
import type { ShopSettings } from "../../types.js";
import { drawDocumentHeader, formatShopAddress } from "../pdf/document-header.js";
import {
  amountInIndianWords,
  formatDateIn,
  formatRupee,
  formatRupeeDecimal,
} from "../pdf/format.js";
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

const INVOICE_GROUP_LABEL: Record<JewelryGroupKey, string> = {
  "Gold Jewelry": "Gold Jewellery",
  "Silver Jewelry": "Silver Jewellery",
  "Imitation Jewelry": "Imitation Jewellery",
};

const resolveHsnCode = (group: JewelryGroupKey, settings: ShopSettings): string => {
  if (group === "Gold Jewelry") return settings.goldHsnCode ?? "7113";
  if (group === "Silver Jewelry") return settings.silverHsnCode ?? "7113";
  return settings.imitationHsnCode ?? "71179010";
};

const drawInvoiceMetaRow = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  invoiceNo: string,
  dateLabel: string,
): void => {
  const rowY = doc.y;
  doc.font("Helvetica").fontSize(9).fillColor("#111827");
  doc.text(`Invoice No: ${invoiceNo}`, left, rowY, { width: contentWidth * 0.5 });
  doc.text(dateLabel, left + contentWidth * 0.5, rowY, {
    width: contentWidth * 0.5,
    align: "right",
  });
  doc.y = rowY + 14;
};

const drawSignatureBlocks = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  businessName: string,
): void => {
  ensureSpace(doc, 70);
  const blockTop = doc.y + 40;
  const halfWidth = contentWidth * 0.45;

  doc.font("Helvetica").fontSize(9).fillColor("#111827");
  doc.text("Customer's Signature", left, blockTop, { width: halfWidth });
  doc.text(`For ${businessName}`, left + contentWidth - halfWidth, blockTop, {
    width: halfWidth,
    align: "right",
  });
  doc.y = blockTop + 16;
};

const drawWholesaleGstBreakup = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  totalAmount: number,
  isIntraState: boolean,
): number => {
  const cgstRate = 0.015;
  const sgstRate = 0.015;
  const igstRate = 0.03;

  const cgst = isIntraState ? totalAmount * cgstRate : 0;
  const sgst = isIntraState ? totalAmount * sgstRate : 0;
  const igst = isIntraState ? 0 : totalAmount * igstRate;
  const rawPayable = totalAmount + cgst + sgst + igst;
  const payableAmount = Math.round(rawPayable);
  const roundOff = payableAmount - rawPayable;

  const gstSummary = isIntraState
    ? `CGST (${(cgstRate * 100).toFixed(2)}% on ${formatRupeeDecimal(totalAmount)}) + SGST (${(sgstRate * 100).toFixed(2)}% on ${formatRupeeDecimal(totalAmount)})`
    : `IGST (${(igstRate * 100).toFixed(2)}% on ${formatRupeeDecimal(totalAmount)})`;

  const totalsRows: Parameters<typeof drawBorderedTable>[4] = [
    {
      cells: [`GST Breakup: ${gstSummary}`, ""],
      alignments: ["left", "right"] as const,
      minHeight: 24,
    },
    {
      cells: ["Total", formatRupeeDecimal(totalAmount)],
      alignments: ["left", "right"] as const,
    },
    {
      cells: ["Total Sales value before GST", formatRupeeDecimal(totalAmount)],
      alignments: ["left", "right"] as const,
    },
    {
      cells: ["Central GST Collected", formatRupeeDecimal(cgst)],
      alignments: ["left", "right"] as const,
    },
    {
      cells: ["State GST Collected", formatRupeeDecimal(sgst)],
      alignments: ["left", "right"] as const,
    },
    {
      cells: ["Integrated GST Collected", formatRupeeDecimal(igst)],
      alignments: ["left", "right"] as const,
    },
    {
      cells: ["Round Off", formatRupeeDecimal(roundOff)],
      alignments: ["left", "right"] as const,
    },
    {
      cells: ["PAYABLE AMOUNT ₹", formatRupeeDecimal(payableAmount)],
      bold: true,
      alignments: ["left", "right"] as const,
      minHeight: 26,
    },
  ];

  const breakupBottom = drawBorderedTable(
    doc,
    left,
    doc.y,
    [contentWidth * 0.62, contentWidth * 0.38],
    totalsRows,
    { defaultFontSize: 9, defaultRowHeight: 22 },
  );
  doc.y = breakupBottom;

  return payableAmount;
};

const renderWholesaleInvoice = (
  doc: PDFKit.PDFDocument,
  transfer: TransferForPdf,
  settings: ShopSettings,
  shopState: string,
): void => {
  const left = doc.page.margins.left;
  const contentWidth = getContentWidth(doc);
  const columnGap = 12;
  const halfColWidth = (contentWidth - columnGap) / 2;

  drawDocumentHeader(doc, settings, "TAX INVOICE", {
    subtitle: "Wholesale GST Invoice",
    includeAddressAndPhone: false,
  });

  const docNo = transfer.invoiceNo ?? transfer.transferNo;
  const displayDate = transfer.dispatchDate ?? transfer.transferDate;
  drawInvoiceMetaRow(
    doc,
    left,
    contentWidth,
    docNo,
    `Date: ${formatDateIn(displayDate.toISOString())}`,
  );

  const infoTop = doc.y;

  const fromLines: string[] = [settings.businessName];
  const shopAddress = formatShopAddress(settings);
  if (shopAddress) fromLines.push(shopAddress);
  if (settings.phone?.trim()) fromLines.push(settings.phone.trim());
  if (settings.email?.trim()) fromLines.push(settings.email.trim());

  const fromBottom = drawLabelValueBox(
    doc,
    left,
    infoTop,
    halfColWidth,
    "FROM",
    fromLines,
  );

  const billToLines: string[] = [];
  if (transfer.customer?.name) billToLines.push(transfer.customer.name);
  if (transfer.customerBranch?.name) billToLines.push(transfer.customerBranch.name);
  if (transfer.recipientAddress?.trim()) billToLines.push(transfer.recipientAddress.trim());
  if (transfer.recipientGstNumber?.trim()) {
    billToLines.push(`Buyer GSTN ${transfer.recipientGstNumber.trim()}`);
  }
  if (transfer.recipientPanNumber?.trim()) {
    billToLines.push(`PAN ${transfer.recipientPanNumber.trim()}`);
  }
  if (transfer.placeOfSupplyStateCode?.trim()) {
    billToLines.push(`State Code ${transfer.placeOfSupplyStateCode.trim()}`);
  }

  const billToBottom = drawLabelValueBox(
    doc,
    left + halfColWidth + columnGap,
    infoTop,
    halfColWidth,
    "BILL TO",
    billToLines.length > 0 ? billToLines : ["—"],
  );

  doc.y = Math.max(fromBottom, billToBottom) + 10;

  const supplyState = transfer.placeOfSupplyState?.trim() || "—";
  const supplyStateCode = transfer.placeOfSupplyStateCode?.trim();
  const supplyLines = supplyStateCode
    ? [`${supplyState} (${supplyStateCode})`]
    : [supplyState];

  const deliveryState = transfer.placeOfDeliveryState?.trim() || "—";
  const deliveryStateCode = transfer.placeOfDeliveryStateCode?.trim();
  const deliveryLines = deliveryStateCode
    ? [`${deliveryState} (${deliveryStateCode})`]
    : [deliveryState];

  const placeTop = doc.y;
  const supplyBottom = drawLabelValueBox(
    doc,
    left,
    placeTop,
    halfColWidth,
    "PLACE OF SUPPLY",
    supplyLines,
  );
  const deliveryBottom = drawLabelValueBox(
    doc,
    left + halfColWidth + columnGap,
    placeTop,
    halfColWidth,
    "PLACE OF DELIVERY",
    deliveryLines,
  );
  doc.y = Math.max(supplyBottom, deliveryBottom) + 10;

  const totalWeight = transfer.items.reduce(
    (sum, item) => sum + (item.weightGrams ? moneyToNumber(item.weightGrams) : 0),
    0,
  );
  const dispatchDate = formatDateIn(
    transfer.dispatchDate?.toISOString() ?? transfer.transferDate.toISOString(),
  );
  const courier = transfer.courierCompany?.trim() || "—";
  doc.font("Helvetica").fontSize(9).fillColor("#111827");
  doc.text(
    `Dispatch Details    ${courier} / Net Wt:- ${totalWeight.toFixed(3)} gms / On ${dispatchDate}`,
    left,
    doc.y,
    { width: contentWidth },
  );
  doc.y += 16;

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
  const totalAmount = moneyToNumber(sumMoney(transfer.items.map((item) => item.price)));

  ensureSpace(doc, 120);
  const itemTableTop = doc.y;
  const colItem = contentWidth * 0.42;
  const colHsn = contentWidth * 0.16;
  const colQty = contentWidth * 0.12;
  const colAmount = contentWidth - colItem - colHsn - colQty;

  const itemRows: Parameters<typeof drawBorderedTable>[4] = [
    {
      cells: ["ITEM", "HSN", "QTY", "AMOUNT (₹)"],
      bold: true,
      alignments: ["left", "center", "center", "right"] as const,
      minHeight: 24,
    },
  ];

  for (const groupName of GROUP_ORDER) {
    const group = grouped.get(groupName)!;
    if (group.pieces === 0) continue;
    itemRows.push({
      cells: [
        INVOICE_GROUP_LABEL[groupName],
        resolveHsnCode(groupName, settings),
        String(group.pieces),
        formatRupeeDecimal(group.amount),
      ],
      alignments: ["left", "center", "center", "right"] as const,
      minHeight: 24,
    });
  }

  itemRows.push({
    cells: ["Total", "", String(totalPieces), formatRupeeDecimal(totalAmount)],
    bold: true,
    alignments: ["left", "center", "center", "right"] as const,
    minHeight: 26,
  });

  const itemTableBottom = drawBorderedTable(
    doc,
    left,
    itemTableTop,
    [colItem, colHsn, colQty, colAmount],
    itemRows,
    { headerRowCount: 1, defaultFontSize: 9, headerFontSize: 9 },
  );
  doc.y = itemTableBottom + 10;

  const termsText =
    settings.invoiceTerms?.trim() ||
    "Goods once sold will not be taken back. Subject to Jaipur jurisdiction only.";
  doc.y =
    drawLabelValueBox(doc, left, doc.y, contentWidth, "TERMS", [termsText]) + 12;

  ensureSpace(doc, 180);
  const sellerState = shopState.trim().toLowerCase();
  const supplyStateNorm = transfer.placeOfSupplyState?.trim().toLowerCase() ?? "";
  const isIntraState = supplyStateNorm.length > 0 && supplyStateNorm === sellerState;

  const payableAmount = drawWholesaleGstBreakup(
    doc,
    left,
    contentWidth,
    totalAmount,
    isIntraState,
  );
  doc.y += 8;

  doc.font("Helvetica").fontSize(9).fillColor("#374151");
  doc.text(`Amount in words: ${amountInIndianWords(payableAmount)}`, left, doc.y, {
    width: contentWidth,
  });
  doc.y += 24;

  drawSignatureBlocks(doc, left, contentWidth, settings.businessName);

  ensureSpace(doc, 40);
  if (settings.registeredOfficeAddress?.trim()) {
    doc.font("Helvetica").fontSize(8).fillColor("#6b7280");
    doc.text(
      `Regd. Office: ${settings.registeredOfficeAddress.trim()}`,
      left,
      doc.y,
      { width: contentWidth, align: "center" },
    );
    doc.y += 14;
  }

  doc.font("Helvetica").fontSize(8).fillColor("#6b7280");
  doc.text("This is a computer-generated document. E. & O.E.", left, doc.y, {
    width: contentWidth,
    align: "center",
  });
};

const renderDeliveryChallan = (
  doc: PDFKit.PDFDocument,
  transfer: TransferForPdf,
  settings: ShopSettings,
): void => {
  const left = doc.page.margins.left;
  const contentWidth = getContentWidth(doc);

  drawDocumentHeader(doc, settings, "DELIVERY CHALLAN");

  const infoTop = doc.y;
  const columnGap = 12;
  const leftColWidth = contentWidth * 0.58;
  const rightColWidth = contentWidth - leftColWidth - columnGap;

  const billToLines: string[] = [];
  if (transfer.customer?.name) billToLines.push(transfer.customer.name);
  if (transfer.customerBranch?.name) billToLines.push(transfer.customerBranch.name);
  if (transfer.recipientAddress?.trim()) billToLines.push(transfer.recipientAddress.trim());
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

  const displayDate = transfer.dispatchDate ?? transfer.transferDate;
  const shipmentLines = [
    `Challan No: ${transfer.transferNo}`,
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
  const colAmount = contentWidth - colSr - colDesc - colPieces - colWeight - colRate;

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
  const totalAmount = moneyToNumber(sumMoney(transfer.items.map((item) => item.price)));

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

  const totalsRows: Parameters<typeof drawBorderedTable>[4] = [
    {
      cells: ["Subtotal", formatRupee(totalAmount)],
      alignments: ["left", "right"] as const,
    },
    {
      cells: ["Grand Total", formatRupee(totalAmount)],
      bold: true,
      alignments: ["left", "right"] as const,
      minHeight: 26,
    },
  ];

  const totalsBottom = drawBorderedTable(
    doc,
    totalsX,
    doc.y,
    [totalsWidth * 0.55, totalsWidth * 0.45],
    totalsRows,
    { defaultFontSize: 9, defaultRowHeight: 22 },
  );

  doc.y = totalsBottom + 8;
  doc.font("Helvetica").fontSize(9).fillColor("#374151");
  doc.text(`Amount in words: ${amountInIndianWords(totalAmount)}`, left, doc.y, {
    width: contentWidth,
  });
  doc.y += 18;

  ensureSpace(doc, 30);
  doc.font("Helvetica").fontSize(9).fillColor("#374151");
  doc.text(
    "This is a Delivery Challan only. No tax is applicable on this document.",
    left,
    doc.y,
    { width: contentWidth },
  );
  doc.y += 16;

  ensureSpace(doc, 80);
  const dispatchLines = [
    `Dispatched via: ${transfer.courierCompany?.trim() || "—"}`,
    `Contact Person: ${transfer.contactPersonName?.trim() || "—"} — ${transfer.contactPersonPhone?.trim() || "—"}`,
    `Dispatch Date: ${formatDateIn(transfer.dispatchDate?.toISOString() ?? transfer.transferDate.toISOString())}`,
    `Total Pieces: ${totalPieces}   |   Total Net Weight: ${totalWeight.toFixed(3)}g`,
  ];
  doc.y =
    drawLabelValueBox(doc, left, doc.y, contentWidth, "Dispatch", dispatchLines) + 12;

  ensureSpace(doc, 40);
  doc.font("Helvetica").fontSize(8).fillColor("#6b7280");
  doc.text("This is a computer-generated document. E. & O.E.", left, doc.y, {
    width: contentWidth,
    align: "center",
  });
};

export const generateTransferInvoicePdf = (
  transfer: TransferForPdf,
  settings: ShopSettings,
  shopState: string,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const isInvoice = transfer.documentType === "Wholesale GST Invoice";
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (isInvoice) {
      renderWholesaleInvoice(doc, transfer, settings, shopState);
    } else {
      renderDeliveryChallan(doc, transfer, settings);
    }

    doc.end();
  });
