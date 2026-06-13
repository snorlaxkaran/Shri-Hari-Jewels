import PDFDocument from "pdfkit";
import type { Invoice, ShopSettings } from "../../types.js";

export const generateInvoicePdf = (
  invoice: Invoice,
  settings: ShopSettings,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(settings.businessName, { align: "center" });
    if (settings.address) {
      doc.fontSize(10).fillColor("#666").text(settings.address, { align: "center" });
    }
    if (settings.phone) {
      doc.text(settings.phone, { align: "center" });
    }

    doc.moveDown();
    doc.fillColor("#000").fontSize(14).text("TAX INVOICE", { align: "center" });
    doc.moveDown();

    doc.fontSize(10);
    doc.text(`Invoice No: ${invoice.invoiceNo}`);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}`);
    doc.text(`Customer: ${invoice.customerName}`);
    doc.text(`Mobile: ${invoice.customerMobile}`);
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

    doc.moveDown(2);
    doc.fontSize(9).fillColor("#888").text("Thank you for your purchase!", {
      align: "center",
    });

    doc.end();
  });
