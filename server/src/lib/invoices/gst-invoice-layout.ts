import type PDFDocument from "pdfkit";
import type { ShopSettings } from "../../types.js";
import { drawDocumentHeader, formatShopAddress } from "../pdf/document-header.js";
import {
  amountInIndianWords,
  formatDateIn,
  formatRupeeDecimal,
} from "../pdf/format.js";
import {
  drawBorderedTable,
  drawLabelValueBox,
  ensureSpace,
  getContentWidth,
} from "../pdf/table.js";

export type JewelryGroupKey = "Gold Jewelry" | "Silver Jewelry" | "Imitation Jewelry";

export const GROUP_ORDER: JewelryGroupKey[] = [
  "Gold Jewelry",
  "Silver Jewelry",
  "Imitation Jewelry",
];

const INVOICE_GROUP_LABEL: Record<JewelryGroupKey, string> = {
  "Gold Jewelry": "Gold Jewellery",
  "Silver Jewelry": "Silver Jewellery",
  "Imitation Jewelry": "Imitation Jewellery",
};

export const resolveJewelryGroup = (metal: string): JewelryGroupKey => {
  if (metal === "Gold" || metal === "Rose Gold") return "Gold Jewelry";
  if (metal === "Silver" || metal === "Platinum") return "Silver Jewelry";
  return "Imitation Jewelry";
};

export const resolveHsnCode = (group: JewelryGroupKey, settings: ShopSettings): string => {
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

export const buildFromLines = (settings: ShopSettings): string[] => {
  const lines: string[] = [settings.businessName];
  const shopAddress = formatShopAddress(settings);
  if (shopAddress) lines.push(shopAddress);
  if (settings.phone?.trim()) lines.push(settings.phone.trim());
  if (settings.email?.trim()) lines.push(settings.email.trim());
  return lines;
};

export const drawInvoiceMetaRow = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  docNoLabel: string,
  docNo: string,
  dateLabel: string,
): void => {
  const rowY = doc.y;
  doc.font("Helvetica").fontSize(9).fillColor("#111827");
  doc.text(`${docNoLabel}: ${docNo}`, left, rowY, { width: contentWidth * 0.5 });
  doc.text(dateLabel, left + contentWidth * 0.5, rowY, {
    width: contentWidth * 0.5,
    align: "right",
  });
  doc.y = rowY + 14;
};

export const drawSideBySideBoxes = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  leftTitle: string,
  leftLines: string[],
  rightTitle: string,
  rightLines: string[],
): void => {
  const columnGap = 12;
  const halfColWidth = (contentWidth - columnGap) / 2;
  const top = doc.y;

  const leftBottom = drawLabelValueBox(
    doc,
    left,
    top,
    halfColWidth,
    leftTitle,
    leftLines.length > 0 ? leftLines : ["—"],
  );
  const rightBottom = drawLabelValueBox(
    doc,
    left + halfColWidth + columnGap,
    top,
    halfColWidth,
    rightTitle,
    rightLines.length > 0 ? rightLines : ["—"],
  );
  doc.y = Math.max(leftBottom, rightBottom) + 10;
};

export const drawPlaceOfSupplyAndDelivery = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  placeOfSupply: string,
  placeOfSupplyCode: string | null,
  placeOfDelivery: string,
  placeOfDeliveryCode: string | null,
): void => {
  const supplyLines = placeOfSupplyCode
    ? [`${placeOfSupply} (${placeOfSupplyCode})`]
    : [placeOfSupply];
  const deliveryLines = placeOfDeliveryCode
    ? [`${placeOfDelivery} (${placeOfDeliveryCode})`]
    : [placeOfDelivery];

  drawSideBySideBoxes(
    doc,
    left,
    contentWidth,
    "PLACE OF SUPPLY",
    supplyLines,
    "PLACE OF DELIVERY",
    deliveryLines,
  );
};

export const drawCompactDispatchLine = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  line: string,
): void => {
  doc.font("Helvetica").fontSize(9).fillColor("#111827");
  doc.text(line, left, doc.y, { width: contentWidth });
  doc.y += 16;
};

export const drawGroupedItemTable = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  lines: GroupedJewelryLine[],
  totalQty: number,
  totalAmount: number,
): void => {
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
    ...lines.map((line) => ({
      cells: [line.label, line.hsn, String(line.qty), formatRupeeDecimal(line.amount)],
      alignments: ["left", "center", "center", "right"] as const,
      minHeight: 24,
    })),
    {
      cells: ["Total", "", String(totalQty), formatRupeeDecimal(totalAmount)],
      bold: true,
      alignments: ["left", "center", "center", "right"] as const,
      minHeight: 26,
    },
  ];

  const itemTableBottom = drawBorderedTable(
    doc,
    left,
    itemTableTop,
    [colItem, colHsn, colQty, colAmount],
    itemRows,
    { headerRowCount: 1, defaultFontSize: 9, headerFontSize: 9 },
  );
  doc.y = itemTableBottom + 10;
};

export const drawTermsSection = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  settings: ShopSettings,
): void => {
  const termsText =
    settings.invoiceTerms?.trim() ||
    "Goods once sold will not be taken back. Subject to Jaipur jurisdiction only.";
  doc.y =
    drawLabelValueBox(doc, left, doc.y, contentWidth, "TERMS", [termsText]) + 12;
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

export const drawGstBreakupSection = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  values: GstBreakupValues,
): void => {
  ensureSpace(doc, 180);

  const cgstRate = 0.015;
  const sgstRate = 0.015;
  const igstRate = 0.03;
  const { taxableAmount, cgst, sgst, igst, roundOff, payableAmount, isIntraState } =
    values;

  const gstSummary = isIntraState
    ? `CGST (${(cgstRate * 100).toFixed(2)}% on ${formatRupeeDecimal(taxableAmount)}) + SGST (${(sgstRate * 100).toFixed(2)}% on ${formatRupeeDecimal(taxableAmount)})`
    : `IGST (${(igstRate * 100).toFixed(2)}% on ${formatRupeeDecimal(taxableAmount)})`;

  const totalsRows: Parameters<typeof drawBorderedTable>[4] = [
    {
      cells: [`GST Breakup: ${gstSummary}`, ""],
      alignments: ["left", "right"] as const,
      minHeight: 24,
    },
    {
      cells: ["Total", formatRupeeDecimal(taxableAmount)],
      alignments: ["left", "right"] as const,
    },
    {
      cells: ["Total Sales value before GST", formatRupeeDecimal(taxableAmount)],
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
  doc.y = breakupBottom + 8;
};

export const drawChallanValueSummary = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  totalAmount: number,
): void => {
  ensureSpace(doc, 60);
  const totalsRows: Parameters<typeof drawBorderedTable>[4] = [
    {
      cells: ["Total Value", formatRupeeDecimal(totalAmount)],
      alignments: ["left", "right"] as const,
    },
  ];
  const bottom = drawBorderedTable(
    doc,
    left,
    doc.y,
    [contentWidth * 0.62, contentWidth * 0.38],
    totalsRows,
    { defaultFontSize: 9, defaultRowHeight: 22 },
  );
  doc.y = bottom + 8;
};

export const drawAmountInWords = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  amount: number,
): void => {
  doc.font("Helvetica").fontSize(9).fillColor("#374151");
  doc.text(`Amount in words: ${amountInIndianWords(amount)}`, left, doc.y, {
    width: contentWidth,
  });
  doc.y += 24;
};

export const drawSignatureBlocks = (
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

export const drawInvoiceFooter = (
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  settings: ShopSettings,
  disclaimer = "This is a computer-generated document. E. & O.E.",
): void => {
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
  doc.text(disclaimer, left, doc.y, { width: contentWidth, align: "center" });
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
  footerDisclaimer?: string;
};

export const renderStandardDocument = (
  doc: PDFKit.PDFDocument,
  layout: StandardDocumentLayout,
): void => {
  const left = doc.page.margins.left;
  const contentWidth = getContentWidth(doc);
  const { settings } = layout;

  drawDocumentHeader(doc, settings, layout.documentTitle, {
    subtitle: layout.subtitle,
    includeAddressAndPhone: false,
  });

  drawInvoiceMetaRow(
    doc,
    left,
    contentWidth,
    layout.docNoLabel,
    layout.docNo,
    `Date: ${formatDateIn(layout.dateIso)}`,
  );

  drawSideBySideBoxes(
    doc,
    left,
    contentWidth,
    "FROM",
    buildFromLines(settings),
    "BILL TO",
    layout.billToLines,
  );

  drawPlaceOfSupplyAndDelivery(
    doc,
    left,
    contentWidth,
    layout.placeOfSupply,
    layout.placeOfSupplyCode ?? null,
    layout.placeOfDelivery,
    layout.placeOfDeliveryCode ?? null,
  );

  drawCompactDispatchLine(doc, left, contentWidth, layout.dispatchLine);

  drawGroupedItemTable(
    doc,
    left,
    contentWidth,
    layout.groupedLines,
    layout.totalQty,
    layout.totalAmount,
  );

  if (layout.showTerms !== false && layout.gstBreakup) {
    drawTermsSection(doc, left, contentWidth, settings);
  }

  if (layout.gstBreakup) {
    drawGstBreakupSection(doc, left, contentWidth, layout.gstBreakup);
    drawAmountInWords(doc, left, contentWidth, layout.gstBreakup.payableAmount);
  } else {
    drawChallanValueSummary(doc, left, contentWidth, layout.totalAmount);
    drawAmountInWords(doc, left, contentWidth, layout.totalAmount);
    if (layout.challanNotice) {
      ensureSpace(doc, 30);
      doc.font("Helvetica").fontSize(9).fillColor("#374151");
      doc.text(layout.challanNotice, left, doc.y, { width: contentWidth });
      doc.y += 16;
    }
  }

  drawSignatureBlocks(doc, left, contentWidth, settings.businessName);
  drawInvoiceFooter(
    doc,
    left,
    contentWidth,
    settings,
    layout.footerDisclaimer,
  );
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
