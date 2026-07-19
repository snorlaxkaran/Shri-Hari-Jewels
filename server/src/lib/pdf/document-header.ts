import type PDFDocument from "pdfkit";
import type { ShopSettings } from "../../types.js";
import { formatStructuredAddress } from "../validation/india.js";

export const formatShopAddress = (settings: ShopSettings): string | null =>
  formatStructuredAddress({
    line1: settings.addressLine1,
    line2: settings.addressLine2,
    city: settings.city,
    state: settings.state,
    pincode: settings.pincode,
    country: settings.country,
  }) ?? settings.address;

export type DocumentHeaderOptions = {
  subtitle?: string;
  includeAddressAndPhone?: boolean;
};

export const drawDocumentHeader = (
  doc: PDFKit.PDFDocument,
  settings: ShopSettings,
  documentTitle: string,
  options?: DocumentHeaderOptions,
): number => {
  const includeAddressAndPhone = options?.includeAddressAndPhone ?? true;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;
  const startY = doc.y;

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#111827");
  doc.text(settings.businessName, left, startY, { width, align: "center" });

  let y = doc.y + 4;

  if (options?.subtitle) {
    doc.font("Helvetica").fontSize(10).fillColor("#374151");
    doc.text(options.subtitle, left, y, { width, align: "center" });
    y = doc.y + 4;
  }

  if (
    includeAddressAndPhone &&
    settings.gstRegisteredName &&
    settings.gstRegisteredName !== settings.businessName
  ) {
    doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
    doc.text(settings.gstRegisteredName, left, y, { width, align: "center" });
    y = doc.y + 2;
  }

  if (includeAddressAndPhone) {
    const shopAddress = formatShopAddress(settings);
    doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
    if (shopAddress) {
      doc.text(shopAddress, left, y, { width, align: "center" });
      y = doc.y + 2;
    }
    if (settings.phone) {
      doc.text(`Phone: ${settings.phone}`, left, y, { width, align: "center" });
      y = doc.y + 2;
    }
  }

  const taxLine = [
    settings.panNumber ? `PAN ${settings.panNumber}` : null,
    settings.gstNumber ? `GSTN ${settings.gstNumber}` : null,
    settings.cinNumber ? `CIN ${settings.cinNumber}` : null,
  ]
    .filter(Boolean)
    .join("   ");
  if (taxLine.length > 0) {
    doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
    doc.text(taxLine, left, y, { width, align: "center" });
    y = doc.y + 6;
  }

  doc.save();
  doc.lineWidth(1).strokeColor("#111827");
  doc.moveTo(left, y).lineTo(right, y).stroke();
  doc.restore();

  y += 10;
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#111827");
  doc.text(documentTitle, left, y, { width, align: "center" });
  y = doc.y + 12;

  doc.y = y;
  return y;
};
