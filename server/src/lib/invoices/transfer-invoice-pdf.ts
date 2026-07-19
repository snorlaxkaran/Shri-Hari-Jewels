import PDFDocument from "pdfkit";
import type {
  Customer,
  CustomerBranch,
  StockTransferItem as DbStockTransferItem,
  StockTransfer as DbStockTransfer,
} from "@prisma/client";
import type { ShopSettings } from "../../types.js";
import {
  computeGstBreakupForPdf,
  groupLinesWithFallback,
  gstStateCodeFromNumber,
  renderStandardDocument,
} from "./gst-invoice-layout.js";
import { formatInvoiceDate } from "../pdf/format.js";
import { moneyToNumber } from "../money.js";

type TransferForPdf = DbStockTransfer & {
  customer?: Pick<Customer, "name"> | null;
  customerBranch?: Pick<CustomerBranch, "name"> | null;
  items: DbStockTransferItem[];
};

const buildTransferBillToLines = (transfer: TransferForPdf): string[] => {
  const lines: string[] = [];
  if (transfer.customer?.name) lines.push(transfer.customer.name);
  if (transfer.customerBranch?.name) lines.push(transfer.customerBranch.name);
  if (transfer.recipientAddress?.trim()) lines.push(transfer.recipientAddress.trim());
  if (transfer.recipientGstNumber?.trim()) {
    lines.push(`Buyer GSTN  ${transfer.recipientGstNumber.trim()}`);
  }
  const stateCode =
    transfer.placeOfSupplyStateCode?.trim() ??
    gstStateCodeFromNumber(transfer.recipientGstNumber);
  const pan = transfer.recipientPanNumber?.trim();
  if (pan && stateCode) {
    lines.push(`PAN  ${pan}    State Code  ${stateCode}`);
  } else if (pan) {
    lines.push(`PAN  ${pan}`);
  } else if (stateCode) {
    lines.push(`State Code  ${stateCode}`);
  }
  return lines;
};

const buildTransferGroupedItems = (
  transfer: TransferForPdf,
  settings: ShopSettings,
) =>
  groupLinesWithFallback(
    transfer.items.map((item) => ({
      metal: item.metal,
      amount: moneyToNumber(item.price),
    })),
    settings,
    moneyToNumber(transfer.totalValue),
    transfer.items.length,
  );

export const generateTransferInvoicePdf = (
  transfer: TransferForPdf,
  settings: ShopSettings,
  shopState: string,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const isInvoice = transfer.documentType === "Wholesale GST Invoice";
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { lines, totalQty, totalAmount } = buildTransferGroupedItems(
      transfer,
      settings,
    );
    const totalWeight = transfer.items.reduce(
      (sum, item) => sum + (item.weightGrams ? moneyToNumber(item.weightGrams) : 0),
      0,
    );
    const displayDate = transfer.dispatchDate ?? transfer.transferDate;
    const courier = transfer.courierCompany?.trim() || "—";
    const dispatchLine = `Dispatch Details  ${courier} / Net Wt:- ${totalWeight.toFixed(2)} gms / On ${formatInvoiceDate(displayDate.toISOString())}`;

    const placeOfSupply = transfer.placeOfSupplyState?.trim() || "—";
    const placeOfDelivery = transfer.placeOfDeliveryState?.trim() || placeOfSupply;

    if (isInvoice) {
      const gstBreakup = computeGstBreakupForPdf(
        totalAmount > 0 ? totalAmount : moneyToNumber(transfer.totalValue),
        shopState,
        transfer.placeOfSupplyState?.trim() ?? "",
      );

      renderStandardDocument(doc, {
        settings,
        subtitle: "Wholesale GST Invoice",
        documentTitle: "TAX INVOICE",
        docNoLabel: "Invoice No",
        docNo: transfer.invoiceNo ?? transfer.transferNo,
        dateIso: displayDate.toISOString(),
        billToLines: buildTransferBillToLines(transfer),
        placeOfSupply,
        placeOfSupplyCode: transfer.placeOfSupplyStateCode,
        placeOfDelivery,
        placeOfDeliveryCode: transfer.placeOfDeliveryStateCode,
        dispatchLine,
        groupedLines: lines,
        totalQty,
        totalAmount: totalAmount > 0 ? totalAmount : moneyToNumber(transfer.totalValue),
        gstBreakup,
      });
    } else {
      renderStandardDocument(doc, {
        settings,
        subtitle: "Delivery Challan",
        documentTitle: "DELIVERY CHALLAN",
        docNoLabel: "Challan No",
        docNo: transfer.transferNo,
        dateIso: displayDate.toISOString(),
        billToLines: buildTransferBillToLines(transfer),
        placeOfSupply,
        placeOfSupplyCode: transfer.placeOfSupplyStateCode,
        placeOfDelivery,
        placeOfDeliveryCode: transfer.placeOfDeliveryStateCode,
        dispatchLine,
        groupedLines: lines,
        totalQty,
        totalAmount,
        showTerms: false,
        challanNotice:
          "This is a Delivery Challan only. No tax is applicable on this document.",
      });
    }

    doc.end();
  });
