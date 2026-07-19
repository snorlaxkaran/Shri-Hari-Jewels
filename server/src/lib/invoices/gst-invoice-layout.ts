import type PDFDocument from "pdfkit";
import type { ShopSettings } from "../../types.js";
import { INVOICE_THEME as T } from "../pdf/invoice-theme.js";
import {
  formatInvoiceDate,
  formatPdfAmount,
} from "../pdf/format.js";
import { formatShopAddress } from "../pdf/document-header.js";
import { getContentWidth } from "../pdf/table.js";

/** Single-page invoice zones (A4, points). */
const PAGE_FOOTER_HEIGHT = 12;
const SIGNATURE_BOTTOM_GAP = 6;
const SIGNATURE_BLOCK_HEIGHT = 28;
const LEGAL_LINE_HEIGHT = 11;
const SECTION_GAP = 8;
const GST_BLOCK_HEIGHT = 178;
const CHALLAN_BLOCK_HEIGHT = 52;

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

const pageContentBottom = (doc: PDFKit.PDFDocument): number =>
  doc.page.height - doc.page.margins.bottom;

type BottomAnchors = {
  itemsMaxY: number;
  gstTop: number;
  legalTop: number;
  signatureLineY: number;
  pageFooterY: number;
};

const measureBottomAnchors = (
  doc: PDFKit.PDFDocument,
  settings: ShopSettings,
  layout: StandardDocumentLayout,
): BottomAnchors => {
  const pageBottom = pageContentBottom(doc);
  const pageFooterY = pageBottom - PAGE_FOOTER_HEIGHT;
  const signatureLineY =
    pageFooterY - SIGNATURE_BOTTOM_GAP - SIGNATURE_BLOCK_HEIGHT;

  let legalLines = 0;
  if (settings.registeredOfficeAddress?.trim()) legalLines += 1;
  if (layout.ackNo?.trim() || layout.gstIrn?.trim()) legalLines += 1;
  const legalHeight =
    legalLines > 0 ? legalLines * LEGAL_LINE_HEIGHT + 4 : 0;
  const legalTop = signatureLineY - legalHeight - (legalHeight > 0 ? 4 : 0);

  const blockHeight = layout.gstBreakup ? GST_BLOCK_HEIGHT : CHALLAN_BLOCK_HEIGHT;
  const gstTop = legalTop - blockHeight - SECTION_GAP;

  return {
    itemsMaxY: gstTop - SECTION_GAP,
    gstTop,
    legalTop,
    signatureLineY,
    pageFooterY,
  };
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

const TABLE_FONT_SIZE = 9;
const TABLE_HEADER_FONT_SIZE = 8;
const TABLE_CELL_PAD = 6;
const TABLE_MIN_ROW = 24;
const TABLE_HEADER_HEIGHT = 26;

const measureTableRowHeight = (
  doc: PDFKit.PDFDocument,
  cells: string[],
  colWidths: number[],
): number => {
  doc.font("Helvetica").fontSize(TABLE_FONT_SIZE);
  let maxH = TABLE_MIN_ROW;
  for (let i = 0; i < cells.length; i += 1) {
    const textWidth = colWidths[i]! - TABLE_CELL_PAD * 2;
    const h = doc.heightOfString(cells[i] ?? "", { width: textWidth });
    maxH = Math.max(maxH, h + TABLE_CELL_PAD * 2);
  }
  return maxH;
};

const drawTribeItemTable = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  startY: number,
  maxY: number,
  lines: GroupedJewelryLine[],
): void => {
  const colItem = contentWidth * 0.44;
  const colHsn = contentWidth * 0.14;
  const colQty = contentWidth * 0.10;
  const colAmount = contentWidth - colItem - colHsn - colQty;
  const colWidths = [colItem, colHsn, colQty, colAmount];
  const headers = ["ITEM", "HSN", "QTY", "AMOUNT (Rs.)"];
  let y = startY;

  doc.save();
  doc.rect(left, y, contentWidth, TABLE_HEADER_HEIGHT).fill(T.tableHeaderFill);
  doc.restore();

  let x = left;
  doc.font("Helvetica-Bold").fontSize(TABLE_HEADER_FONT_SIZE).fillColor(T.tableHeaderText);
  for (let i = 0; i < headers.length; i += 1) {
    doc.text(headers[i]!, x + TABLE_CELL_PAD, y + 7, {
      width: colWidths[i]! - TABLE_CELL_PAD * 2,
      align: i >= 2 ? "right" : "left",
      lineBreak: false,
    });
    x += colWidths[i]!;
  }
  y += TABLE_HEADER_HEIGHT;

  for (let rowIndex = 0; rowIndex < lines.length; rowIndex += 1) {
    const line = lines[rowIndex]!;
    const cells = [
      line.label,
      line.hsn,
      String(line.qty),
      formatPdfAmount(line.amount),
    ];
    let rowHeight = measureTableRowHeight(doc, cells, colWidths);
    if (y + rowHeight > maxY) {
      if (rowIndex === 0) {
        rowHeight = Math.max(TABLE_MIN_ROW, maxY - y);
      } else {
        break;
      }
    }

    if (rowIndex % 2 === 1) {
      doc.save();
      doc.rect(left, y, contentWidth, rowHeight).fill(T.panelFill);
      doc.restore();
    }

    x = left;
    doc.font("Helvetica").fontSize(TABLE_FONT_SIZE).fillColor(T.text);
    for (let i = 0; i < cells.length; i += 1) {
      const textWidth = colWidths[i]! - TABLE_CELL_PAD * 2;
      const textHeight = doc.heightOfString(cells[i]!, { width: textWidth });
      const cellY = y + Math.max(TABLE_CELL_PAD, (rowHeight - textHeight) / 2);
      doc.text(cells[i]!, x + TABLE_CELL_PAD, cellY, {
        width: textWidth,
        align: i >= 2 ? "right" : "left",
        height: rowHeight - TABLE_CELL_PAD * 2,
        ellipsis: true,
      });
      x += colWidths[i]!;
    }

    doc.save();
    doc.lineWidth(0.75).strokeColor(T.border);
    doc.moveTo(left, y + rowHeight).lineTo(left + contentWidth, y + rowHeight).stroke();
    doc.restore();

    y += rowHeight;
  }
};

const drawTotalsRow = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
): number => {
  const labelWidth = width * 0.62;
  const valueWidth = width - labelWidth;
  doc.font("Helvetica").fontSize(9).fillColor(T.muted);
  doc.text(label, x, y, { width: labelWidth, align: "left" });
  doc.font("Helvetica").fontSize(9).fillColor(T.text);
  doc.text(value, x + labelWidth, y, { width: valueWidth, align: "right" });
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
  doc.text(`Rs. ${formatPdfAmount(amount)}`, x, y + 8, {
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
  topY: number,
): void => {
  const leftWidth = contentWidth * 0.4;
  const rightWidth = contentWidth * 0.58;
  const rightX = left + contentWidth - rightWidth;

  const termsText =
    settings.invoiceTerms?.trim() ||
    "Goods once sold will not be taken back. Subject to Jaipur jurisdiction only.";

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(T.gold);
  doc.text("TERMS", left, topY, { width: leftWidth });
  doc.font("Helvetica").fontSize(7.8).fillColor(T.muted);
  doc.text(termsText, left, topY + 14, { width: leftWidth });

  const gstTitleY = topY + 14 + doc.heightOfString(termsText, { width: leftWidth }) + 10;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(T.gold);
  doc.text("GST BREAKUP", left, gstTitleY, { width: leftWidth });

  const cgstRate = 0.015;
  const sgstRate = 0.015;
  const igstRate = 0.03;
  const { taxableAmount, cgst, sgst, igst, roundOff, payableAmount, isIntraState } =
    values;

  const gstSummary = isIntraState
    ? `GST Breakup: CGST (${(cgstRate * 100).toFixed(2)}% on ${formatPdfAmount(taxableAmount)}) + SGST (${(sgstRate * 100).toFixed(2)}% on ${formatPdfAmount(taxableAmount)})`
    : `GST Breakup: IGST (${(igstRate * 100).toFixed(2)}% on ${formatPdfAmount(taxableAmount)})`;

  doc.font("Helvetica").fontSize(7.8).fillColor(T.muted);
  doc.text(gstSummary, left, gstTitleY + 14, { width: leftWidth });

  let rowY = topY;
  rowY = drawTotalsRow(doc, rightX, rowY, rightWidth, "Total", formatPdfAmount(taxableAmount));
  rowY = drawTotalsRow(
    doc,
    rightX,
    rowY,
    rightWidth,
    "Total Sales value before GST",
    formatPdfAmount(taxableAmount),
  );
  rowY = drawTotalsRow(
    doc,
    rightX,
    rowY,
    rightWidth,
    "Central GST Collected",
    formatPdfAmount(cgst),
  );
  rowY = drawTotalsRow(
    doc,
    rightX,
    rowY,
    rightWidth,
    "State GST Collected",
    formatPdfAmount(sgst),
  );
  rowY = drawTotalsRow(
    doc,
    rightX,
    rowY,
    rightWidth,
    "Integrated GST Collected",
    formatPdfAmount(igst),
  );
  rowY = drawTotalsRow(
    doc,
    rightX,
    rowY,
    rightWidth,
    "Round Off",
    formatPdfAmount(roundOff),
  );

  const sectionBottom = Math.max(
    gstTitleY + 14 + doc.heightOfString(gstSummary, { width: leftWidth }),
    rowY,
  );
  drawPayableBar(doc, rightX, sectionBottom + 4, rightWidth, payableAmount);
};

const drawChallanBottomSection = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  totalAmount: number,
  topY: number,
  notice?: string,
): void => {
  const rightWidth = contentWidth * 0.58;
  const rightX = left + contentWidth - rightWidth;
  let rowY = topY;

  if (notice) {
    doc.font("Helvetica").fontSize(8).fillColor(T.muted);
    doc.text(notice, left, topY, { width: contentWidth * 0.38 });
    rowY = topY + 28;
  }

  rowY = drawTotalsRow(doc, rightX, rowY, rightWidth, "Total Value", formatPdfAmount(totalAmount));
  drawPayableBar(doc, rightX, rowY + 4, rightWidth, totalAmount);
};

const drawSignatureRow = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  businessName: string,
  lineY: number,
): void => {
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
};

const drawLegalFooter = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  settings: ShopSettings,
  topY: number,
  ackNo?: string | null,
  gstIrn?: string | null,
): void => {
  let y = topY;

  if (settings.registeredOfficeAddress?.trim()) {
    doc.font("Helvetica").fontSize(7.8).fillColor(T.muted);
    doc.text(
      `Regd. Office: ${settings.registeredOfficeAddress.trim()}`,
      left,
      y,
      { width: contentWidth, align: "center", lineBreak: false },
    );
    y += LEGAL_LINE_HEIGHT;
  }

  const ackParts = [
    ackNo?.trim() ? `ACK No: ${ackNo.trim()}` : null,
    gstIrn?.trim() ? `GST IRN: ${gstIrn.trim()}` : null,
  ].filter(Boolean);

  if (ackParts.length > 0) {
    doc.font("Helvetica").fontSize(7.8).fillColor(T.muted);
    doc.text(ackParts.join(" | "), left, y, {
      width: contentWidth,
      align: "center",
      lineBreak: false,
    });
  }
};

const drawPageFooter = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  y: number,
): void => {
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
  const anchors = measureBottomAnchors(doc, settings, layout);
  const businessName = settings.gstRegisteredName ?? settings.businessName;

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

  const itemsStartY = doc.y;
  drawTribeItemTable(
    doc,
    left,
    contentWidth,
    itemsStartY,
    anchors.itemsMaxY,
    layout.groupedLines,
  );

  if (layout.gstBreakup) {
    drawGstBottomSection(
      doc,
      left,
      contentWidth,
      settings,
      layout.gstBreakup,
      anchors.gstTop,
    );
  } else {
    drawChallanBottomSection(
      doc,
      left,
      contentWidth,
      layout.totalAmount,
      anchors.gstTop,
      layout.challanNotice,
    );
  }

  drawLegalFooter(
    doc,
    left,
    contentWidth,
    settings,
    anchors.legalTop,
    layout.ackNo,
    layout.gstIrn,
  );

  drawSignatureRow(
    doc,
    left,
    contentWidth,
    businessName,
    anchors.signatureLineY,
  );

  drawPageFooter(doc, left, contentWidth, anchors.pageFooterY);
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
