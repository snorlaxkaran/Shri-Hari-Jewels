import PDFDocument from "pdfkit";
import type { Customer, Invoice, ShopSettings } from "../../types.js";
import { resolveBranchState } from "../branches/resolve-state.js";
import {
  resolveGroupedLinesForPdf,
  resolveGstBreakupForInvoice,
  resolveInvoiceItemsForPdf,
} from "./invoice-pdf-data.js";
import {
  gstStateCodeFromNumber,
  renderStandardDocument,
} from "./gst-invoice-layout.js";
import { formatInvoiceDate } from "../pdf/format.js";
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
    lines.push(`Buyer GSTN  ${customerBilling.gstNumber.trim()}`);
  }
  const stateCode = gstStateCodeFromNumber(customerBilling?.gstNumber);
  const pan = customerBilling?.panNumber?.trim();
  if (pan && stateCode) {
    lines.push(`PAN  ${pan}    State Code  ${stateCode}`);
  } else if (pan) {
    lines.push(`PAN  ${pan}`);
  } else if (stateCode) {
    lines.push(`State Code  ${stateCode}`);
  }
  return lines;
};

export type InvoiceSellingBranch = {
  id: string;
  name: string;
  address?: string | null;
};

export const resolveRetailPlaceFields = (
  invoice: Invoice,
  settings: ShopSettings,
  sellingBranch?: InvoiceSellingBranch | null,
): { placeOfSupply: string; placeOfDelivery: string } => {
  const branchState = sellingBranch ? resolveBranchState(sellingBranch) : null;
  const placeOfSupply =
    branchState ||
    invoice.placeOfSupply?.trim() ||
    settings.state?.trim() ||
    "—";
  return {
    placeOfSupply,
    placeOfDelivery: branchState || placeOfSupply,
  };
};

export const generateInvoicePdf = async (
  invoice: Invoice,
  settings: ShopSettings,
  customerBilling: InvoiceCustomerBilling | null | undefined,
  organizationId: string,
  sellingBranch?: InvoiceSellingBranch | null,
  eInvoiceMeta?: { irn?: string | null; ackNo?: string | null },
): Promise<Buffer> => {
  const items = await resolveInvoiceItemsForPdf(invoice, organizationId);
  const { lines, totalQty, totalAmount } = resolveGroupedLinesForPdf(
    items,
    settings,
    invoice.taxableValue,
    items.length,
  );

  const { placeOfSupply, placeOfDelivery } = resolveRetailPlaceFields(
    invoice,
    settings,
    sellingBranch,
  );
  const supplyCode = gstStateCodeFromNumber(customerBilling?.gstNumber);
  const dispatchLine = `Dispatch Details  ${invoice.paymentMode} / On ${formatInvoiceDate(invoice.createdAt)}`;
  const gstBreakup = resolveGstBreakupForInvoice(invoice, settings.state ?? "");

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
      docNo: invoice.invoiceNo,
      dateIso: invoice.createdAt,
      billToLines: buildSaleBillToLines(invoice, customerBilling),
      placeOfSupply,
      placeOfSupplyCode: supplyCode,
      placeOfDelivery,
      placeOfDeliveryCode: supplyCode,
      dispatchLine,
      groupedLines: lines,
      totalQty,
      totalAmount: totalAmount > 0 ? totalAmount : invoice.taxableValue,
      gstBreakup,
      gstIrn: eInvoiceMeta?.irn ?? null,
      ackNo: eInvoiceMeta?.ackNo ?? null,
    });

    doc.end();
  });
};
