import PDFDocument from "pdfkit";
import type { Customer, Invoice, ShopSettings } from "../../types.js";
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

const formatShopAddress = (settings: ShopSettings): string | null =>
  formatStructuredAddress({
    line1: settings.addressLine1,
    line2: settings.addressLine2,
    city: settings.city,
    state: settings.state,
    pincode: settings.pincode,
    country: settings.country,
  }) ?? settings.address;

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
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(settings.businessName, { align: "center" });
    if (settings.gstRegisteredName && settings.gstRegisteredName !== settings.businessName) {
      doc.fontSize(9).fillColor("#666").text(settings.gstRegisteredName, { align: "center" });
    }

    const shopAddress = formatShopAddress(settings);
    if (shopAddress) {
      doc.fontSize(10).fillColor("#666").text(shopAddress, { align: "center" });
    }
    if (settings.phone) {
      doc.text(settings.phone, { align: "center" });
    }
    if (settings.gstNumber) {
      doc.text(`GSTIN: ${settings.gstNumber}`, { align: "center" });
    }
    if (settings.panNumber) {
      doc.text(`PAN: ${settings.panNumber}`, { align: "center" });
    }

    doc.moveDown();
    doc.fillColor("#000").fontSize(14).text("TAX INVOICE", { align: "center" });
    doc.moveDown();

    doc.fontSize(10);
    doc.text(`Invoice No: ${invoice.invoiceNo}`);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}`);
    doc.text(`Customer: ${invoice.customerName}`);
    doc.text(`Mobile: ${invoice.customerMobile}`);

    if (customerBilling?.gstNumber) {
      doc.text(`Customer GSTIN: ${customerBilling.gstNumber}`);
    }
    if (customerBilling?.gstRegisteredName) {
      doc.text(`Bill To: ${customerBilling.gstRegisteredName}`);
    }
    const billingAddress = formatCustomerBillingAddress(customerBilling);
    if (billingAddress) {
      doc.text(`Billing Address: ${billingAddress}`);
    }

    doc.moveDown();

    doc.fontSize(11).text("Item Details", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Product: ${invoice.productName}`);
    doc.text(`SKU: ${invoice.sku}`);
    doc.text(`Item Code: ${invoice.itemCode}`);
    doc.moveDown();

    const formatRupee = (n: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n);

    doc.text(`List Price: ${formatRupee(invoice.listPrice)}`);
    if (invoice.discount > 0) {
      doc.text(`Discount: -${formatRupee(invoice.discount)}`);
    }
    doc.fontSize(12).text(`Total Paid: ${formatRupee(invoice.total)}`, { continued: false });
    doc.moveDown();

    doc.fontSize(10);
    doc.text(`Payment Mode: ${invoice.paymentMode}`);
    if (invoice.paymentRef) {
      doc.text(`Payment Ref: ${invoice.paymentRef}`);
    }

    const hasBankDetails =
      settings.bankAccountName ||
      settings.bankAccountNumber ||
      settings.bankIfsc ||
      settings.bankName;

    if (hasBankDetails) {
      doc.moveDown();
      doc.fontSize(11).text("Bank Details (for transfers)", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      if (settings.bankName) doc.text(`Bank: ${settings.bankName}`);
      if (settings.bankAccountName) doc.text(`Account Name: ${settings.bankAccountName}`);
      if (settings.bankAccountNumber) doc.text(`Account No: ${settings.bankAccountNumber}`);
      if (settings.bankIfsc) doc.text(`IFSC: ${settings.bankIfsc}`);
    }

    if (settings.upiVpa) {
      doc.text(`UPI: ${settings.upiVpa}`);
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor("#888").text("Thank you for your purchase!", {
      align: "center",
    });

    doc.end();
  });
