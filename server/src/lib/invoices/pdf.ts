import PDFDocument from "pdfkit";
import type { Customer, Invoice, ShopSettings } from "../../types.js";
import {
  resolveGroupedLinesForPdf,
  resolveGstBreakupForInvoice,
  resolveInvoiceItemsForPdf,
} from "./invoice-pdf-data.js";
import {
  gstStateCodeFromNumber,
  renderStandardDocument,
} from "./gst-invoice-layout.js";
import { formatDateIn } from "../pdf/format.js";
import { formatStructuredAddress } from "../validation/india.js";

export type InvoiceCustomerBilling = Pick<
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

const buildSaleBillToLines = (
  invoice: Invoice,
  customerBilling?: InvoiceCustomerBilling | null,
): string[] => {
  const lines = [invoice.customerName];
  if (invoice.customerMobile?.trim()) {
    lines.push(`Mobile: ${invoice.customerMobile.trim()}`);
  }
  if (customerBilling?.gstRegisteredName?.trim()) {
    lines.push(customerBilling.gstRegisteredName.trim());
  }
  const billingAddress = formatCustomerBillingAddress(customerBilling);
  if (billingAddress) lines.push(billingAddress);
  if (customerBilling?.gstNumber?.trim()) {
    lines.push(`Buyer GSTN ${customerBilling.gstNumber.trim()}`);
  }
  if (customerBilling?.panNumber?.trim()) {
    lines.push(`PAN ${customerBilling.panNumber.trim()}`);
  }
  const stateCode = gstStateCodeFromNumber(customerBilling?.gstNumber);
  if (stateCode) lines.push(`State Code ${stateCode}`);
  return lines;
};

export const generateInvoicePdf = async (
  invoice: Invoice,
  settings: ShopSettings,
  customerBilling: InvoiceCustomerBilling | null | undefined,
  organizationId: string,
): Promise<Buffer> => {
  const items = await resolveInvoiceItemsForPdf(invoice, organizationId);
  const enrichedInvoice: Invoice = { ...invoice, items, itemCount: items.length };

  const { lines, totalQty, totalAmount } = resolveGroupedLinesForPdf(
    items,
    settings,
    enrichedInvoice.taxableValue,
    items.length,
  );

  const placeOfSupply =
    enrichedInvoice.placeOfSupply?.trim() || settings.state?.trim() || "—";
  const placeOfDelivery =
    customerBilling?.billingState?.trim() || placeOfSupply;
  const supplyCode = gstStateCodeFromNumber(customerBilling?.gstNumber);
  const dispatchLine = `Dispatch Details    ${enrichedInvoice.paymentMode} / On ${formatDateIn(enrichedInvoice.createdAt)}`;
  const gstBreakup = resolveGstBreakupForInvoice(
    enrichedInvoice,
    settings.state ?? "",
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    renderStandardDocument(doc, {
      settings,
      documentTitle: "TAX INVOICE",
      docNoLabel: "Invoice No",
      docNo: enrichedInvoice.invoiceNo,
      dateIso: enrichedInvoice.createdAt,
      billToLines: buildSaleBillToLines(enrichedInvoice, customerBilling),
      placeOfSupply,
      placeOfSupplyCode: supplyCode,
      placeOfDelivery,
      placeOfDeliveryCode: supplyCode,
      dispatchLine,
      groupedLines: lines,
      totalQty,
      totalAmount: totalAmount > 0 ? totalAmount : enrichedInvoice.taxableValue,
      gstBreakup,
      footerDisclaimer:
        "This is a computer-generated tax invoice. E. & O.E. Thank you for your purchase.",
    });

    doc.end();
  });
};
