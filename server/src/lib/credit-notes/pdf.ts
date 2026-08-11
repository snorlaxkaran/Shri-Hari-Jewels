import PDFDocument from "pdfkit";
import type { CreditNote, Customer, ShopSettings } from "../../types.js";
import {
  gstStateCodeFromNumber,
  groupLinesByJewelryCategory,
  isIntraStateSupply,
  renderStandardDocument,
  type GstBreakupValues,
} from "../invoices/gst-invoice-layout.js";
import { formatInvoiceDate } from "../pdf/format.js";
import { formatStructuredAddress } from "../validation/india.js";

type CreditNoteCustomerBilling = Pick<
  Customer,
  | "gstNumber"
  | "gstRegisteredName"
  | "panNumber"
  | "billingAddressLine1"
  | "billingAddressLine2"
  | "billingCity"
  | "billingState"
  | "billingPincode"
  | "billingCountry"
>;

const buildBillToLines = (
  creditNote: CreditNote,
  customerBilling?: CreditNoteCustomerBilling | null,
): string[] => {
  const lines = [creditNote.customerName];
  if (creditNote.customerMobile?.trim()) {
    lines.push(`Mobile: ${creditNote.customerMobile.trim()}`);
  }
  if (customerBilling?.gstRegisteredName?.trim()) {
    lines.push(customerBilling.gstRegisteredName.trim());
  }
  const billingAddress = customerBilling
    ? formatStructuredAddress({
        line1: customerBilling.billingAddressLine1,
        line2: customerBilling.billingAddressLine2,
        city: customerBilling.billingCity,
        state: customerBilling.billingState,
        pincode: customerBilling.billingPincode,
        country: customerBilling.billingCountry,
      })
    : null;
  if (billingAddress) lines.push(billingAddress);
  if (customerBilling?.gstNumber?.trim()) {
    lines.push(`Buyer GSTN  ${customerBilling.gstNumber.trim()}`);
  }
  return lines;
};

export const generateCreditNotePdf = async (
  creditNote: CreditNote,
  settings: ShopSettings,
  customerBilling: CreditNoteCustomerBilling | null | undefined,
  originalInvoiceNo: string,
  eInvoiceMeta?: { irn?: string | null; ackNo?: string | null },
): Promise<Buffer> => {
  const placeOfSupply =
    creditNote.placeOfSupply?.trim() || settings.state?.trim() || "—";
  const placeOfDelivery = placeOfSupply;

  const grouped = groupLinesByJewelryCategory(
    creditNote.items.map((item) => ({
      metal: item.metal || "Base Metal",
      amount: item.amount,
    })),
    settings,
  );
  const { lines, totalQty, totalAmount } = grouped;

  const supplyCode = gstStateCodeFromNumber(customerBilling?.gstNumber);
  const dispatchLine = `Against Invoice ${originalInvoiceNo} · Refund via ${creditNote.refundMode} · ${formatInvoiceDate(creditNote.createdAt)}`;

  const gstBreakup: GstBreakupValues = {
    taxableAmount: creditNote.taxableValue,
    cgst: creditNote.cgst,
    sgst: creditNote.sgst,
    igst: creditNote.igst,
    roundOff: creditNote.roundOff,
    payableAmount: creditNote.total,
    isIntraState: isIntraStateSupply(settings.state ?? "", placeOfSupply),
  };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    renderStandardDocument(doc, {
      settings,
      documentTitle: "CREDIT NOTE",
      docNoLabel: "Credit Note No",
      docNo: creditNote.creditNoteNo,
      dateIso: creditNote.createdAt,
      billToLines: buildBillToLines(creditNote, customerBilling),
      placeOfSupply,
      placeOfSupplyCode: supplyCode,
      placeOfDelivery,
      placeOfDeliveryCode: supplyCode,
      dispatchLine,
      groupedLines: lines,
      totalQty,
      totalAmount: totalAmount > 0 ? totalAmount : creditNote.taxableValue,
      gstBreakup,
      gstIrn: eInvoiceMeta?.irn ?? null,
      ackNo: eInvoiceMeta?.ackNo ?? null,
      subtitle: `Original Invoice: ${originalInvoiceNo}`,
    });

    doc.end();
  });
};

export const generateDebitNotePdf = async (
  debitNote: {
    debitNoteNo: string;
    createdAt: string;
    vendorName?: string;
    purchaseBillNo?: string;
    reason: string;
    reasonText?: string;
    subtotal: number;
    gstAmount: number;
    total: number;
  },
  settings: ShopSettings,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text("DEBIT NOTE", { align: "center" });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(settings.businessName);
    if (settings.gstNumber) doc.text(`GSTIN: ${settings.gstNumber}`);
    doc.moveDown();
    doc.text(`Debit Note No: ${debitNote.debitNoteNo}`);
    doc.text(`Date: ${formatInvoiceDate(debitNote.createdAt)}`);
    if (debitNote.purchaseBillNo) {
      doc.text(`Against Bill: ${debitNote.purchaseBillNo}`);
    }
    doc.moveDown();
    doc.text(`Vendor: ${debitNote.vendorName ?? "—"}`);
    doc.text(`Reason: ${debitNote.reason}${debitNote.reasonText ? ` — ${debitNote.reasonText}` : ""}`);
    doc.moveDown();
    doc.text(`Subtotal: ₹${debitNote.subtotal.toFixed(2)}`);
    doc.text(`GST: ₹${debitNote.gstAmount.toFixed(2)}`);
    doc.text(`Total Debit: ₹${debitNote.total.toFixed(2)}`, { underline: true });

    doc.end();
  });
};
