import PDFDocument from "pdfkit";
import type { Customer, Invoice, ShopSettings } from "../../types.js";
import {
  groupLinesByJewelryCategory,
  gstStateCodeFromNumber,
  renderStandardDocument,
  type GstBreakupValues,
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

const gstBreakupFromInvoice = (invoice: Invoice, shopState: string): GstBreakupValues => {
  const placeOfSupply = invoice.placeOfSupply?.trim() ?? "";
  const seller = shopState.trim().toLowerCase();
  const supply = placeOfSupply.toLowerCase();

  return {
    taxableAmount: invoice.taxableValue,
    cgst: invoice.cgst,
    sgst: invoice.sgst,
    igst: invoice.igst,
    roundOff: invoice.roundOff,
    payableAmount: invoice.total,
    isIntraState: supply.length > 0 && supply === seller,
  };
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

    const { lines, totalQty, totalAmount } = groupLinesByJewelryCategory(
      invoice.items.map((item) => ({
        metal: item.metal,
        amount: item.amount,
      })),
      settings,
    );

    const placeOfSupply = invoice.placeOfSupply?.trim() || settings.state?.trim() || "—";
    const placeOfDelivery =
      customerBilling?.billingState?.trim() || placeOfSupply;
    const supplyCode = gstStateCodeFromNumber(customerBilling?.gstNumber);
    const dispatchLine = `Dispatch Details    ${invoice.paymentMode} / On ${formatDateIn(invoice.createdAt)}`;

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
      totalAmount,
      gstBreakup: gstBreakupFromInvoice(invoice, settings.state ?? ""),
      footerDisclaimer:
        "This is a computer-generated tax invoice. E. & O.E. Thank you for your purchase.",
    });

    doc.end();
  });
