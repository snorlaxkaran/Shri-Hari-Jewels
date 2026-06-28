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

export const drawDocumentHeader = (
  doc: PDFKit.PDFDocument,
  settings: ShopSettings,
  documentTitle: string,
): number => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;
  const startY = doc.y;

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#111827");
  doc.text(settings.businessName, left, startY, { width, align: "center" });

  let y = doc.y + 4;

  if (settings.gstRegisteredName && settings.gstRegisteredName !== settings.businessName) {
    doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
    doc.text(settings.gstRegisteredName, left, y, { width, align: "center" });
    y = doc.y + 2;
  }

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

  const taxLines: string[] = [];
  if (settings.gstNumber) taxLines.push(`GSTIN: ${settings.gstNumber}`);
  if (settings.panNumber) taxLines.push(`PAN: ${settings.panNumber}`);
  if (taxLines.length > 0) {
    doc.text(taxLines.join("  |  "), left, y, { width, align: "center" });
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
