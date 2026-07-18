import { prisma } from "../db.js";
import type { TallyExportLog, TallyExportType } from "../../types.js";
import { moneyToNumber } from "../money.js";
import {
  buildPaymentVoucherXml,
  buildPurchaseVoucherXml,
  buildReceiptVoucherXml,
  buildSalesVoucherXml,
  wrapTallyEnvelope,
} from "./xml-builder.js";

export class TallyExportError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "TallyExportError";
  }
}

const VALID_TYPES: TallyExportType[] = ["sales", "purchases", "receipts", "payments"];

export type TallyExportQuery = {
  from: string;
  to: string;
  types: TallyExportType[];
  organizationId: string;
  exportedByName: string;
  branchId?: string;
};

const parseDateRange = (from: string, to: string) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new TallyExportError("Invalid date range.");
  }
  toDate.setHours(23, 59, 59, 999);
  if (fromDate > toDate) {
    throw new TallyExportError("From date must be before to date.");
  }
  return { fromDate, toDate };
};

const toExportLog = (row: {
  id: string;
  organizationId: string;
  fromDate: Date;
  toDate: Date;
  types: string[];
  exportedByName: string;
  fileName: string | null;
  createdAt: Date;
}): TallyExportLog => ({
  id: row.id,
  fromDate: row.fromDate.toISOString(),
  toDate: row.toDate.toISOString(),
  types: row.types as TallyExportType[],
  exportedByName: row.exportedByName,
  fileName: row.fileName ?? undefined,
  createdAt: row.createdAt.toISOString(),
});

export const listTallyExportLogs = async (
  organizationId: string,
): Promise<TallyExportLog[]> => {
  const rows = await prisma.tallyExportLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(toExportLog);
};

export const generateTallyExport = async (
  query: TallyExportQuery,
): Promise<{ xml: string; fileName: string; log: TallyExportLog }> => {
  const types = query.types.filter((t) => VALID_TYPES.includes(t));
  if (types.length === 0) {
    throw new TallyExportError("Select at least one voucher type to export.");
  }

  const { fromDate, toDate } = parseDateRange(query.from, query.to);
  const branchFilter = query.branchId ? { branchId: query.branchId } : {};

  const messages: string[] = [];

  if (types.includes("sales")) {
    const invoices = await prisma.invoice.findMany({
      where: {
        branch: { organizationId: query.organizationId },
        createdAt: { gte: fromDate, lte: toDate },
        ...branchFilter,
      },
      orderBy: { createdAt: "asc" },
    });

    messages.push(
      ...buildSalesVoucherXml(
        invoices.map((inv) => ({
          invoiceNo: inv.invoiceNo,
          createdAt: inv.createdAt,
          customerName: inv.customerName,
          taxableValue: moneyToNumber(inv.taxableValue),
          cgst: moneyToNumber(inv.cgst),
          sgst: moneyToNumber(inv.sgst),
          igst: moneyToNumber(inv.igst),
          roundOff: moneyToNumber(inv.roundOff),
          total: moneyToNumber(inv.total),
          paymentMode: inv.paymentMode,
        })),
      ),
    );
  }

  if (types.includes("purchases")) {
    const bills = await prisma.purchaseBill.findMany({
      where: {
        organizationId: query.organizationId,
        billDate: { gte: fromDate, lte: toDate },
        ...branchFilter,
      },
      include: { vendor: { select: { name: true } } },
      orderBy: { billDate: "asc" },
    });

    messages.push(
      ...buildPurchaseVoucherXml(
        bills.map((bill) => ({
          billNo: bill.billNo,
          billDate: bill.billDate,
          vendorName: bill.vendor.name,
          subtotal: moneyToNumber(bill.subtotal),
          gstAmount: moneyToNumber(bill.gstAmount),
          total: moneyToNumber(bill.total),
        })),
      ),
    );
  }

  if (types.includes("receipts")) {
    const installments = await prisma.schemeInstallment.findMany({
      where: {
        paidAt: { gte: fromDate, lte: toDate },
        enrollment: {
          scheme: { organizationId: query.organizationId },
          ...(query.branchId ? { branchId: query.branchId } : {}),
        },
      },
      include: {
        enrollment: {
          include: { customer: { select: { name: true } } },
        },
      },
      orderBy: { paidAt: "asc" },
    });

    messages.push(
      ...buildReceiptVoucherXml(
        installments.map((row) => ({
          referenceNo: `SCH-${row.id.slice(0, 8).toUpperCase()}`,
          date: row.paidAt,
          partyName: row.enrollment.customer.name,
          amount: moneyToNumber(row.amount),
          paymentMode: row.paymentMode,
          narration: `Scheme installment receipt`,
        })),
      ),
    );
  }

  if (types.includes("payments")) {
    const bills = await prisma.purchaseBill.findMany({
      where: {
        organizationId: query.organizationId,
        createdAt: { gte: fromDate, lte: toDate },
        paidAmount: { gt: 0 },
        ...branchFilter,
      },
      include: { vendor: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    messages.push(
      ...buildPaymentVoucherXml(
        bills.map((bill) => ({
          referenceNo: `PAY-${bill.billNo}`,
          date: bill.createdAt,
          partyName: bill.vendor.name,
          amount: moneyToNumber(bill.paidAmount),
          paymentMode: "Cash",
          narration: `Payment against bill ${bill.billNo}`,
        })),
      ),
    );
  }

  if (messages.length === 0) {
    throw new TallyExportError("No vouchers found for the selected period and types.");
  }

  const xml = wrapTallyEnvelope(messages);
  const fromLabel = fromDate.toISOString().slice(0, 10);
  const toLabel = toDate.toISOString().slice(0, 10);
  const fileName = `tally-export_${fromLabel}_${toLabel}.xml`;

  const logRow = await prisma.tallyExportLog.create({
    data: {
      organizationId: query.organizationId,
      fromDate,
      toDate,
      types,
      exportedByName: query.exportedByName,
      fileName,
    },
  });

  return { xml, fileName, log: toExportLog(logRow) };
};
