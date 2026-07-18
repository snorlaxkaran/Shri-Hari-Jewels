import PDFDocument from "pdfkit";
import type { Customer, Invoice, ShopSettings } from "../../types.js";
import { drawDocumentHeader } from "../pdf/document-header.js";
import { amountInIndianWords, formatDateIn, formatRupee } from "../pdf/format.js";
import {
  drawBorderedTable,
  drawLabelValueBox,
  ensureSpace,
  getContentWidth,
} from "../pdf/table.js";
import { formatStructuredAddress } from "../validation/india.js";

export type InvoiceCustomerBilling = Pick<
  Customer,
  | "gstNumber"
  | "gstRegisteredName"
  | "billingAddressLine1"
  | "billingAddressLine2"
  | "billingCity"
  | "billingState"
  | "billingPincode"
  | "billingCountry"
>;

const formatCustomerBillingAddress = (
  customer?: InvoiceCustomerBilling | null,
): string | null => {
  if (!customer) return null;
  return formatStructuredAddress({
    line1: customer.billingAddressLine1,
    line2: customer.billingAddressLine2,
    city: customer.billingCity,
    state: customer.billingState,
    pincode: customer.billingPincode,
    country: customer.billingCountry,
  });
};

export const generateInvoicePdf = (
  invoice: Invoice,
  settings: ShopSettings,
  customerBilling?: InvoiceCustomerBilling | null,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const contentWidth = getContentWidth(doc);

    drawDocumentHeader(doc, settings, "TAX INVOICE");

    const infoTop = doc.y;
    const columnGap = 12;
    const leftColWidth = contentWidth * 0.58;
    const rightColWidth = contentWidth - leftColWidth - columnGap;

    const billToLines = [
      invoice.customerName,
      `Mobile: ${invoice.customerMobile}`,
    ];
    if (customerBilling?.gstRegisteredName) {
      billToLines.push(customerBilling.gstRegisteredName);
    }
    if (customerBilling?.gstNumber) {
      billToLines.push(`GSTIN: ${customerBilling.gstNumber}`);
    }
    const billingAddress = formatCustomerBillingAddress(customerBilling);
    if (billingAddress) {
      billToLines.push(billingAddress);
    }

    const billToBottom = drawLabelValueBox(
      doc,
      left,
      infoTop,
      leftColWidth,
      "Bill To",
      billToLines,
    );

    const invoiceMetaLines = [
      `Invoice No: ${invoice.invoiceNo}`,
      `Invoice Date: ${formatDateIn(invoice.createdAt)}`,
      `Payment Status: ${invoice.status}`,
      `Payment Mode: ${invoice.paymentMode}`,
    ];
    if (invoice.placeOfSupply) {
      invoiceMetaLines.push(`Place of Supply: ${invoice.placeOfSupply}`);
    }
    if (invoice.paymentRef) {
      invoiceMetaLines.push(`Payment Ref: ${invoice.paymentRef}`);
    }

    const invoiceMetaBottom = drawLabelValueBox(
      doc,
      left + leftColWidth + columnGap,
      infoTop,
      rightColWidth,
      "Invoice Details",
      invoiceMetaLines,
    );

    doc.y = Math.max(billToBottom, invoiceMetaBottom) + 14;

    ensureSpace(doc, 120);
    const itemTableTop = doc.y;
    const colSr = contentWidth * 0.05;
    const colDesc = contentWidth * 0.24;
    const colHsn = contentWidth * 0.1;
    const colSku = contentWidth * 0.14;
    const colRate = contentWidth * 0.13;
    const colDisc = contentWidth * 0.1;
    const colAmount =
      contentWidth - colSr - colDesc - colHsn - colSku - colRate - colDisc;

    const itemRows = [
      {
        cells: ["#", "Description", "HSN", "SKU / Code", "Rate", "Disc.", "Amount"],
        bold: true,
        alignments: ["center", "left", "center", "left", "right", "right", "right"] as const,
        minHeight: 24,
      },
      ...invoice.items.map((item, index) => ({
        cells: [
          String(index + 1),
          item.productName,
          item.hsnCode ?? "—",
          `${item.sku}\n${item.itemCode}`,
          formatRupee(item.listPrice),
          item.discount > 0 ? formatRupee(item.discount) : "—",
          formatRupee(item.amount),
        ],
        alignments: ["center", "left", "center", "left", "right", "right", "right"] as const,
        minHeight: 32,
      })),
    ];

    const itemTableBottom = drawBorderedTable(
      doc,
      left,
      itemTableTop,
      [colSr, colDesc, colHsn, colSku, colRate, colDisc, colAmount],
      itemRows,
      { headerRowCount: 1, defaultFontSize: 8, headerFontSize: 8 },
    );

    doc.y = itemTableBottom + 10;

    const totalsWidth = contentWidth * 0.42;
    const totalsX = left + contentWidth - totalsWidth;
    const totalsTop = doc.y;

    const totalsRows: Array<{
      cells: string[];
      bold?: boolean;
      alignments: readonly ["left", "right"];
      minHeight?: number;
    }> = [
      {
        cells: ["Subtotal", formatRupee(invoice.subtotal)],
        alignments: ["left", "right"] as const,
      },
    ];

    if (invoice.discount > 0) {
      totalsRows.push({
        cells: ["Discount", `-${formatRupee(invoice.discount)}`],
        alignments: ["left", "right"] as const,
      });
    }

    totalsRows.push({
      cells: ["Taxable Value", formatRupee(invoice.taxableValue)],
      alignments: ["left", "right"] as const,
    });

    if (invoice.cgst > 0) {
      totalsRows.push({
        cells: ["CGST @ 1.5%", formatRupee(invoice.cgst)],
        alignments: ["left", "right"] as const,
      });
    }
    if (invoice.sgst > 0) {
      totalsRows.push({
        cells: ["SGST @ 1.5%", formatRupee(invoice.sgst)],
        alignments: ["left", "right"] as const,
      });
    }
    if (invoice.igst > 0) {
      totalsRows.push({
        cells: ["IGST @ 3%", formatRupee(invoice.igst)],
        alignments: ["left", "right"] as const,
      });
    }
    if (invoice.roundOff !== 0) {
      totalsRows.push({
        cells: ["Round Off", formatRupee(invoice.roundOff)],
        alignments: ["left", "right"] as const,
      });
    }

    totalsRows.push({
      cells: ["Payable Amount", formatRupee(invoice.total)],
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
    doc.text(`Amount in words: ${amountInIndianWords(invoice.total)}`, left, doc.y, {
      width: contentWidth,
    });
    doc.y += 18;

    const hasBankDetails =
      settings.bankAccountName ||
      settings.bankAccountNumber ||
      settings.bankIfsc ||
      settings.bankName ||
      settings.upiVpa;

    if (hasBankDetails) {
      ensureSpace(doc, 80);
      const bankLines: string[] = [];
      if (settings.bankName) bankLines.push(`Bank: ${settings.bankName}`);
      if (settings.bankAccountName) {
        bankLines.push(`Account Name: ${settings.bankAccountName}`);
      }
      if (settings.bankAccountNumber) {
        bankLines.push(`Account No: ${settings.bankAccountNumber}`);
      }
      if (settings.bankIfsc) bankLines.push(`IFSC: ${settings.bankIfsc}`);
      if (settings.upiVpa) bankLines.push(`UPI: ${settings.upiVpa}`);

      doc.y =
        drawLabelValueBox(doc, left, doc.y, contentWidth, "Payment Information", bankLines) +
        12;
    }

    ensureSpace(doc, 40);
    doc.font("Helvetica").fontSize(8).fillColor("#6b7280");
    doc.text(
      "This is a computer-generated tax invoice. E. & O.E. Thank you for your purchase.",
      left,
      doc.y,
      { width: contentWidth, align: "center" },
    );

    doc.end();
  });
