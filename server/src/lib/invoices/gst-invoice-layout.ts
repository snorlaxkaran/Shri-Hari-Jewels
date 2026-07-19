import type PDFDocument from "pdfkit";
import type { ShopSettings } from "../../types.js";
import { INVOICE_THEME as T } from "../pdf/invoice-theme.js";
import {
  formatInvoiceDate,
  formatRupeeDecimal,
} from "../pdf/format.js";
import { formatShopAddress } from "../pdf/document-header.js";
import { ensureSpace, getContentWidth } from "../pdf/table.js";

export type JewelryGroupKey =
  | "Gold Jewelry"
  | "Silver Jewelry"
  | "Zinc Jewelry"
  | "Imitation Jewelry";

export const GROUP_ORDER: JewelryGroupKey[] = [
  "Gold Jewelry",
  "Silver Jewelry",
  "Zinc Jewelry",
  "Imitation Jewelry",
];

const INVOICE_GROUP_LABEL: Record<JewelryGroupKey, string> = {
  "Gold Jewelry": "Gold Jewellery",
  "Silver Jewelry": "Silver Jewellery",
  "Zinc Jewelry": "Zinc Jewellery",
  "Imitation Jewelry": "Imitation Jewellery",
};

export const resolveJewelryGroup = (metal: string): JewelryGroupKey => {
  if (metal === "Gold" || metal === "Rose Gold") return "Gold Jewelry";
  if (metal === "Silver" || metal === "Platinum") return "Silver Jewelry";
  if (metal === "Zinc") return "Zinc Jewelry";
  return "Imitation Jewelry";
};

export const resolveHsnCode = (
  group: JewelryGroupKey,
  settings: ShopSettings,
): string => {
  if (group === "Gold Jewelry") return settings.goldHsnCode ?? "7113";
  if (group === "Silver Jewelry") return settings.silverHsnCode ?? "7113";
  return settings.imitationHsnCode ?? "71179010";
};

export const gstStateCodeFromNumber = (gstNumber?: string | null): string | null => {
  const trimmed = gstNumber?.trim();
  if (!trimmed || trimmed.length < 2) return null;
  return trimmed.slice(0, 2);
};

export type GroupedJewelryLine = {
  label: string;
  hsn: string;
  qty: number;
  amount: number;
};

export const groupLinesByJewelryCategory = (
  items: Array<{ metal: string; amount: number }>,
  settings: ShopSettings,
): { lines: GroupedJewelryLine[]; totalQty: number; totalAmount: number } => {
  const grouped = new Map<JewelryGroupKey, { qty: number; amount: number }>();
  for (const key of GROUP_ORDER) {
    grouped.set(key, { qty: 0, amount: 0 });
  }

  for (const item of items) {
    const key = resolveJewelryGroup(item.metal);
    const entry = grouped.get(key)!;
    entry.qty += 1;
    entry.amount += item.amount;
  }

  const lines: GroupedJewelryLine[] = [];
  let totalQty = 0;
  let totalAmount = 0;

  for (const groupName of GROUP_ORDER) {
    const group = grouped.get(groupName)!;
    if (group.qty === 0) continue;
    lines.push({
      label: INVOICE_GROUP_LABEL[groupName],
      hsn: resolveHsnCode(groupName, settings),
      qty: group.qty,
      amount: group.amount,
    });
    totalQty += group.qty;
    totalAmount += group.amount;
  }

  return { lines, totalQty, totalAmount };
};

export const groupLinesWithFallback = (
  items: Array<{ metal: string; amount: number }>,
  settings: ShopSettings,
  fallbackAmount: number,
  fallbackQty: number,
): { lines: GroupedJewelryLine[]; totalQty: number; totalAmount: number } => {
  const grouped = groupLinesByJewelryCategory(items, settings);
  if (grouped.lines.length > 0 && grouped.totalAmount > 0) {
    return grouped;
  }

  if (fallbackAmount <= 0) {
    return grouped;
  }

  const qty = Math.max(fallbackQty, 1);
  return {
    lines: [
      {
        label: "Imitation Jewellery",
        hsn: resolveHsnCode("Imitation Jewelry", settings),
        qty,
        amount: fallbackAmount,
      },
    ],
    totalQty: qty,
    totalAmount: fallbackAmount,
  };
};

export const buildFromLines = (settings: ShopSettings): string[] => {
  const lines: string[] = [settings.gstRegisteredName ?? settings.businessName];
  const shopAddress = formatShopAddress(settings);
  if (shopAddress) lines.push(shopAddress);
  if (settings.phone?.trim()) lines.push(settings.phone.trim());
  if (settings.email?.trim()) lines.push(settings.email.trim());
  return lines;
};

const drawGoldRule = (
  doc: PDFKit.PDFDocument,
  left: number,
  right: number,
  y: number,
): void => {
  doc.save();
  doc.lineWidth(0.75).strokeColor(T.gold);
  doc.moveTo(left, y).lineTo(right, y).stroke();
  doc.restore();
};

const drawTribeHeader = (
  doc: PDFKit.PDFDocument,
  settings: ShopSettings,
  layout: {
    documentTitle: string;
    subtitle?: string;
    docNoLabel: string;
    docNo: string;
    dateIso: string;
  },
): void => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const contentWidth = right - left;
  const leftColWidth = contentWidth * 0.55;
  const topY = doc.y;

  doc.font("Helvetica-Bold").fontSize(20).fillColor(T.gold);
  doc.text(settings.businessName, left, topY, { width: leftColWidth });

  let leftY = doc.y + 2;
  if (layout.subtitle) {
    doc.font("Helvetica").fontSize(8.5).fillColor(T.muted);
    doc.text(layout.subtitle, left, leftY, { width: leftColWidth });
    leftY = doc.y + 4;
  }

  doc.font("Helvetica").fontSize(9).fillColor(T.muted);
  doc.text(`${layout.docNoLabel}.  ${layout.docNo}`, left, leftY, {
    width: leftColWidth,
  });
  leftY = doc.y + 2;
  doc.text(`Invoice Date  ${formatInvoiceDate(layout.dateIso)}`, left, leftY, {
    width: leftColWidth,
  });

  doc.font("Helvetica-Bold").fontSize(13).fillColor(T.text);
  doc.text(layout.documentTitle, left + leftColWidth, topY, {
    width: contentWidth - leftColWidth,
    align: "right",
  });

  const headerBottom = Math.max(doc.y, leftY + 14);
  drawGoldRule(doc, left, right, headerBottom + 4);

  const taxParts = [
    settings.panNumber ? `PAN  ${settings.panNumber}` : null,
    settings.gstNumber ? `GSTN  ${settings.gstNumber}` : null,
    settings.cinNumber ? `CIN  ${settings.cinNumber}` : null,
  ].filter(Boolean);

  let y = headerBottom + 10;
  if (taxParts.length > 0) {
    doc.font("Helvetica-Bold").fontSize(7.8).fillColor(T.muted);
    doc.text(taxParts.join("     "), left, y, { width: contentWidth, align: "center" });
    y = doc.y + 8;
  }

  doc.y = y;
};

const drawAddressPanel = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  fromLines: string[],
  billToLines: string[],
): void => {
  const padding = 10;
  const columnGap = 16;
  const colWidth = (contentWidth - columnGap) / 2;
  const top = doc.y;

  doc.font("Helvetica-Bold").fontSize(8.5);
  const fromTitleH = doc.heightOfString("FROM", { width: colWidth });
  doc.font("Helvetica").fontSize(9.5);
  let fromContentH = 0;
  for (const line of fromLines.length > 0 ? fromLines : ["—"]) {
    fromContentH += doc.heightOfString(line, { width: colWidth - padding }) + 2;
  }

  doc.font("Helvetica-Bold").fontSize(8.5);
  const billTitleH = doc.heightOfString("BILL TO", { width: colWidth });
  doc.font("Helvetica").fontSize(9.5);
  let billContentH = 0;
  for (const line of billToLines.length > 0 ? billToLines : ["—"]) {
    billContentH += doc.heightOfString(line, { width: colWidth - padding }) + 2;
  }

  const panelHeight =
    padding * 2 +
    Math.max(
      fromTitleH + 4 + fromContentH,
      billTitleH + 4 + billContentH,
    );

  doc.save();
  doc.rect(left, top, contentWidth, panelHeight).fill(T.panelFill);
  doc.lineWidth(0.75).strokeColor(T.border);
  doc.rect(left, top, contentWidth, panelHeight).stroke();
  doc
    .moveTo(left + colWidth + columnGap / 2, top)
    .lineTo(left + colWidth + columnGap / 2, top + panelHeight)
    .stroke();
  doc.restore();

  const fromX = left + padding;
  const billX = left + colWidth + columnGap + padding;

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(T.gold);
  doc.text("FROM", fromX, top + padding, { width: colWidth - padding });
  let textY = top + padding + fromTitleH + 4;
  fromLines.forEach((line, index) => {
    doc
      .font(index === 0 ? "Helvetica-Bold" : "Helvetica")
      .fontSize(9.5)
      .fillColor(T.text);
    doc.text(line, fromX, textY, { width: colWidth - padding });
    textY += doc.heightOfString(line, { width: colWidth - padding }) + 2;
  });

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(T.gold);
  doc.text("BILL TO", billX, top + padding, { width: colWidth - padding });
  textY = top + padding + billTitleH + 4;
  billToLines.forEach((line, index) => {
    doc
      .font(index === 0 ? "Helvetica-Bold" : "Helvetica")
      .fontSize(9.5)
      .fillColor(T.text);
    doc.text(line, billX, textY, { width: colWidth - padding });
    textY += doc.heightOfString(line, { width: colWidth - padding }) + 2;
  });

  doc.y = top + panelHeight + 10;
};

const drawPlaceColumns = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  placeOfSupply: string,
  placeOfDelivery: string,
): void => {
  const columnGap = 16;
  const colWidth = (contentWidth - columnGap) / 2;
  const top = doc.y;

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(T.gold);
  doc.text("PLACE OF SUPPLY", left, top, { width: colWidth });
  doc.text("PLACE OF DELIVERY", left + colWidth + columnGap, top, {
    width: colWidth,
  });

  const labelH = doc.heightOfString("PLACE OF SUPPLY", { width: colWidth });
  doc.font("Helvetica").fontSize(9.5).fillColor(T.text);
  doc.text(placeOfSupply, left, top + labelH + 3, { width: colWidth });
  doc.text(placeOfDelivery, left + colWidth + columnGap, top + labelH + 3, {
    width: colWidth,
  });

  doc.y = top + labelH + doc.heightOfString(placeOfSupply, { width: colWidth }) + 12;
};

const drawDispatchLine = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  line: string,
): void => {
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(T.text);
  doc.text(line, left, doc.y, { width: contentWidth });
  doc.y += 16;
};

const drawTribeItemTable = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  lines: GroupedJewelryLine[],
): void => {
  ensureSpace(doc, 80);
  const colItem = contentWidth * 0.42;
  const colHsn = contentWidth * 0.16;
  const colQty = contentWidth * 0.12;
  const colAmount = contentWidth - colItem - colHsn - colQty;
  const colWidths = [colItem, colHsn, colQty, colAmount];
  const headers = ["ITEM", "HSN", "QTY", "AMOUNT (\u20B9)"];
  const rowHeight = 27;
  const headerHeight = 27;
  let y = doc.y;

  doc.save();
  doc.rect(left, y, contentWidth, headerHeight).fill(T.tableHeaderFill);
  doc.restore();

  let x = left;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(T.tableHeaderText);
  for (let i = 0; i < headers.length; i += 1) {
    doc.text(headers[i]!, x + 6, y + 8, {
      width: colWidths[i]! - 12,
      align: i >= 2 ? "right" : "left",
    });
    x += colWidths[i]!;
  }
  y += headerHeight;

  lines.forEach((line, rowIndex) => {
    if (rowIndex % 2 === 1) {
      doc.save();
      doc.rect(left, y, contentWidth, rowHeight).fill(T.panelFill);
      doc.restore();
    }

    const cells = [
      line.label,
      line.hsn,
      String(line.qty),
      formatRupeeDecimal(line.amount),
    ];
    x = left;
    doc.font("Helvetica").fontSize(9.5).fillColor(T.text);
    for (let i = 0; i < cells.length; i += 1) {
      doc.text(cells[i]!, x + 6, y + 7, {
        width: colWidths[i]! - 12,
        align: i >= 2 ? "right" : "left",
      });
      x += colWidths[i]!;
    }

    doc.save();
    doc.lineWidth(0.75).strokeColor(T.border);
    doc.moveTo(left, y + rowHeight).lineTo(left + contentWidth, y + rowHeight).stroke();
    doc.restore();

    y += rowHeight;
  });

  doc.y = y + 8;
};

const drawTotalsRow = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  labelBold = false,
): number => {
  doc.font(labelBold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(9)
    .fillColor(T.muted);
  doc.text(label, x, y, { width: width * 0.62, align: "left" });
  doc.font("Helvetica").fontSize(9).fillColor(T.text);
  doc.text(value, x, y, { width, align: "right" });
  return y + 18;
};

const drawPayableBar = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  amount: number,
): number => {
  const barHeight = 28;
  doc.save();
  doc.rect(x, y, width, barHeight).fill(T.payableBarFill);
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(T.payableBarText);
  doc.text("PAYABLE AMOUNT", x + 10, y + 8, { width: width * 0.55 });
  doc.text(`\u20B9 ${formatRupeeDecimal(amount)}`, x, y + 8, {
    width: width - 10,
    align: "right",
  });

  return y + barHeight;
};

const drawGstBottomSection = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  settings: ShopSettings,
  values: GstBreakupValues,
): void => {
  ensureSpace(doc, 220);
  const leftWidth = contentWidth * 0.4;
  const rightWidth = contentWidth * 0.58;
  const rightX = left + contentWidth - rightWidth;
  const top = doc.y;

  const termsText =
    settings.invoiceTerms?.trim() ||
    "Goods once sold will not be taken back. Subject to Jaipur jurisdiction only.";

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(T.gold);
  doc.text("TERMS", left, top, { width: leftWidth });
  doc.font("Helvetica").fontSize(7.8).fillColor(T.muted);
  doc.text(termsText, left, top + 14, { width: leftWidth });

  const gstTitleY = top + 14 + doc.heightOfString(termsText, { width: leftWidth }) + 10;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(T.gold);
  doc.text("GST BREAKUP", left, gstTitleY, { width: leftWidth });

  const cgstRate = 0.015;
  const sgstRate = 0.015;
  const igstRate = 0.03;
  const { taxableAmount, cgst, sgst, igst, roundOff, payableAmount, isIntraState } =
    values;

  const gstSummary = isIntraState
    ? `GST Breakup: CGST (${(cgstRate * 100).toFixed(2)}% on ${formatRupeeDecimal(taxableAmount)}) + SGST (${(sgstRate * 100).toFixed(2)}% on ${formatRupeeDecimal(taxableAmount)})`
    : `GST Breakup: IGST (${(igstRate * 100).toFixed(2)}% on ${formatRupeeDecimal(taxableAmount)})`;

  doc.font("Helvetica").fontSize(7.8).fillColor(T.muted);
  doc.text(gstSummary, left, gstTitleY + 14, { width: leftWidth });

  let rowY = top;
  rowY = drawTotalsRow(doc, rightX, rowY, rightWidth, "Total", formatRupeeDecimal(taxableAmount));
  rowY = drawTotalsRow(
    doc,
    rightX,
    rowY,
    rightWidth,
    "Total Sales value before GST",
    formatRupeeDecimal(taxableAmount),
  );
  rowY = drawTotalsRow(
    doc,
    rightX,
    rowY,
    rightWidth,
    "Central GST Collected",
    formatRupeeDecimal(cgst),
  );
  rowY = drawTotalsRow(
    doc,
    rightX,
    rowY,
    rightWidth,
    "State GST Collected",
    formatRupeeDecimal(sgst),
  );
  rowY = drawTotalsRow(
    doc,
    rightX,
    rowY,
    rightWidth,
    "Integrated GST Collected",
    formatRupeeDecimal(igst),
  );
  rowY = drawTotalsRow(
    doc,
    rightX,
    rowY,
    rightWidth,
    "Round Off",
    formatRupeeDecimal(roundOff),
  );

  const sectionBottom = Math.max(
    gstTitleY + 14 + doc.heightOfString(gstSummary, { width: leftWidth }),
    rowY,
  );
  drawPayableBar(doc, rightX, sectionBottom + 4, rightWidth, payableAmount);
  doc.y = sectionBottom + 40;
};

const drawChallanBottomSection = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  totalAmount: number,
  notice?: string,
): void => {
  ensureSpace(doc, 80);
  const rightWidth = contentWidth * 0.58;
  const rightX = left + contentWidth - rightWidth;
  let rowY = doc.y;
  rowY = drawTotalsRow(doc, rightX, rowY, rightWidth, "Total Value", formatRupeeDecimal(totalAmount));
  rowY = drawPayableBar(doc, rightX, rowY + 4, rightWidth, totalAmount);
  doc.y = rowY + 12;

  if (notice) {
    doc.font("Helvetica").fontSize(9).fillColor(T.muted);
    doc.text(notice, left, doc.y, { width: contentWidth * 0.4 });
    doc.y += 20;
  }
};

const drawSignatureRow = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  businessName: string,
): void => {
  ensureSpace(doc, 60);
  const lineY = doc.y + 28;
  doc.save();
  doc.lineWidth(0.75).strokeColor(T.border);
  doc.moveTo(left, lineY).lineTo(left + contentWidth, lineY).stroke();
  doc.restore();

  doc.font("Helvetica").fontSize(8.5).fillColor(T.muted);
  doc.text("Customer's Signature", left, lineY + 8, {
    width: contentWidth * 0.45,
  });
  doc.text(`For ${businessName}`, left, lineY + 8, {
    width: contentWidth,
    align: "right",
  });
  doc.y = lineY + 28;
};

const drawLegalFooter = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  settings: ShopSettings,
  ackNo?: string | null,
  gstIrn?: string | null,
): void => {
  if (settings.registeredOfficeAddress?.trim()) {
    doc.font("Helvetica").fontSize(7.8).fillColor(T.muted);
    doc.text(
      `Regd. Office: ${settings.registeredOfficeAddress.trim()}`,
      left,
      doc.y,
      { width: contentWidth, align: "center" },
    );
    doc.y += 12;
  }

  const ackParts = [
    ackNo?.trim() ? `ACK No: ${ackNo.trim()}` : null,
    gstIrn?.trim() ? `GST IRN: ${gstIrn.trim()}` : null,
  ].filter(Boolean);

  if (ackParts.length > 0) {
    doc.font("Helvetica").fontSize(7.8).fillColor(T.muted);
    doc.text(ackParts.join(" | "), left, doc.y, {
      width: contentWidth,
      align: "center",
    });
    doc.y += 12;
  }
};

const drawPageFooter = (doc: PDFKit.PDFDocument): void => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const contentWidth = right - left;
  const y = doc.page.height - doc.page.margins.bottom - 6;

  doc.font("Helvetica").fontSize(7.5).fillColor(T.muted);
  doc.text("This is a computer-generated invoice.", left, y, {
    width: contentWidth * 0.7,
    align: "left",
    lineBreak: false,
  });
  doc.text("Page 1", left, y, {
    width: contentWidth,
    align: "right",
    lineBreak: false,
  });
};

export type GstBreakupValues = {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  payableAmount: number;
  isIntraState: boolean;
};

export type StandardDocumentLayout = {
  settings: ShopSettings;
  documentTitle: string;
  subtitle?: string;
  docNoLabel: string;
  docNo: string;
  dateIso: string;
  billToLines: string[];
  placeOfSupply: string;
  placeOfSupplyCode?: string | null;
  placeOfDelivery: string;
  placeOfDeliveryCode?: string | null;
  dispatchLine: string;
  groupedLines: GroupedJewelryLine[];
  totalQty: number;
  totalAmount: number;
  showTerms?: boolean;
  gstBreakup?: GstBreakupValues;
  challanNotice?: string;
  ackNo?: string | null;
  gstIrn?: string | null;
};

export const renderStandardDocument = (
  doc: PDFKit.PDFDocument,
  layout: StandardDocumentLayout,
): void => {
  const left = doc.page.margins.left;
  const contentWidth = getContentWidth(doc);
  const { settings } = layout;

  drawTribeHeader(doc, settings, {
    documentTitle: layout.documentTitle,
    subtitle: layout.subtitle,
    docNoLabel: layout.docNoLabel,
    docNo: layout.docNo,
    dateIso: layout.dateIso,
  });

  drawAddressPanel(
    doc,
    left,
    contentWidth,
    buildFromLines(settings),
    layout.billToLines,
  );

  drawPlaceColumns(
    doc,
    left,
    contentWidth,
    layout.placeOfSupply,
    layout.placeOfDelivery,
  );

  drawDispatchLine(doc, left, contentWidth, layout.dispatchLine);
  drawTribeItemTable(doc, left, contentWidth, layout.groupedLines);

  if (layout.gstBreakup) {
    drawGstBottomSection(doc, left, contentWidth, settings, layout.gstBreakup);
  } else {
    drawChallanBottomSection(
      doc,
      left,
      contentWidth,
      layout.totalAmount,
      layout.challanNotice,
    );
  }

  drawSignatureRow(
    doc,
    left,
    contentWidth,
    settings.gstRegisteredName ?? settings.businessName,
  );
  drawLegalFooter(
    doc,
    left,
    contentWidth,
    settings,
    layout.ackNo,
    layout.gstIrn,
  );
  drawPageFooter(doc);
};

export const isIntraStateSupply = (shopState: string, placeOfSupply: string): boolean => {
  const supply = placeOfSupply.trim().toLowerCase();
  const seller = shopState.trim().toLowerCase();
  return supply.length > 0 && supply === seller;
};

export const computeGstBreakupForPdf = (
  taxableAmount: number,
  shopState: string,
  placeOfSupply: string,
): GstBreakupValues => {
  const intra = isIntraStateSupply(shopState, placeOfSupply);
  const cgst = intra ? taxableAmount * 0.015 : 0;
  const sgst = intra ? taxableAmount * 0.015 : 0;
  const igst = intra ? 0 : taxableAmount * 0.03;
  const rawPayable = taxableAmount + cgst + sgst + igst;
  const payableAmount = Math.round(rawPayable);
  const roundOff = payableAmount - rawPayable;

  return {
    taxableAmount,
    cgst,
    sgst,
    igst,
    roundOff,
    payableAmount,
    isIntraState: intra,
  };
};
