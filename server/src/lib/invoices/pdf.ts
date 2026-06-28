import PDFDocument from "pdfkit";
import type { Customer, Invoice, ShopSettings } from "../../types.js";
import { drawDocumentHeader } from "../pdf/document-header.js";
import { amountInIndianWords, formatDateIn, formatRupee } from "../pdf/format.js";
import { drawProductionProcessTrackingSheet } from "../pdf/process-tracking-sheet.js";
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
    const colSr = contentWidth * 0.06;
    const colDesc = contentWidth * 0.44;
    const colSku = contentWidth * 0.18;
    const colRate = contentWidth * 0.16;
    const colAmount = contentWidth - colSr - colDesc - colSku - colRate;

    const itemRows = [
      {
        cells: ["#", "Description", "SKU / Item Code", "Rate", "Amount"],
        bold: true,
        alignments: ["center", "left", "left", "right", "right"] as const,
        minHeight: 24,
      },
      {
        cells: [
          "1",
          invoice.productName,
          `${invoice.sku}\n${invoice.itemCode}`,
          formatRupee(invoice.listPrice),
          formatRupee(invoice.listPrice),
        ],
        alignments: ["center", "left", "left", "right", "right"] as const,
        minHeight: 36,
      },
    ];

    if (invoice.discount > 0) {
      itemRows.push({
        cells: [
          "",
          "Discount",
          "",
          "",
          `-${formatRupee(invoice.discount)}`,
        ],
        alignments: ["center", "left", "left", "right", "right"] as const,
        minHeight: 22,
      });
    }

    const itemTableBottom = drawBorderedTable(
      doc,
      left,
      itemTableTop,
      [colSr, colDesc, colSku, colRate, colAmount],
      itemRows,
      { headerRowCount: 1, defaultFontSize: 9, headerFontSize: 9 },
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
        cells: ["Subtotal", formatRupee(invoice.listPrice)],
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
      cells: ["Grand Total", formatRupee(invoice.total)],
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

    ensureSpace(doc, 220);
    drawProductionProcessTrackingSheet(doc);

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
