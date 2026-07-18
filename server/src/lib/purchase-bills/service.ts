import { prisma } from "../db.js";
import type {
  NewPurchaseBillInput,
  PurchaseBill,
  UpdatePurchaseBillInput,
} from "../../types.js";
import { moneyToNumber, toMoney } from "../money.js";

export class PurchaseBillError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "PurchaseBillError";
  }
}

const billInclude = {
  vendor: { select: { id: true, name: true, gstNumber: true } },
  entryVoucher: { select: { id: true, voucherCode: true } },
};

const deriveStatus = (total: number, paidAmount: number): string => {
  if (paidAmount <= 0) return "Unpaid";
  if (paidAmount >= total) return "Paid";
  return "Partially Paid";
};

const toPurchaseBill = (row: {
  id: string;
  organizationId: string;
  branchId: string;
  vendorId: string;
  billNo: string;
  billDate: Date;
  entryVoucherId: string | null;
  subtotal: { toString(): string };
  gstAmount: { toString(): string };
  total: { toString(): string };
  paidAmount: { toString(): string };
  status: string;
  createdAt: Date;
  vendor?: { id: string; name: string; gstNumber: string | null };
  entryVoucher?: { id: string; voucherCode: string } | null;
}): PurchaseBill => ({
  id: row.id,
  organizationId: row.organizationId,
  branchId: row.branchId,
  vendorId: row.vendorId,
  vendorName: row.vendor?.name,
  vendorGstNumber: row.vendor?.gstNumber ?? undefined,
  billNo: row.billNo,
  billDate: row.billDate.toISOString(),
  entryVoucherId: row.entryVoucherId ?? undefined,
  entryVoucherCode: row.entryVoucher?.voucherCode,
  subtotal: moneyToNumber(row.subtotal.toString()),
  gstAmount: moneyToNumber(row.gstAmount.toString()),
  total: moneyToNumber(row.total.toString()),
  paidAmount: moneyToNumber(row.paidAmount.toString()),
  status: row.status,
  createdAt: row.createdAt.toISOString(),
});

export const listPurchaseBills = async (
  organizationId: string,
  branchId?: string,
): Promise<PurchaseBill[]> => {
  const rows = await prisma.purchaseBill.findMany({
    where: {
      organizationId,
      ...(branchId ? { branchId } : {}),
    },
    include: billInclude,
    orderBy: { billDate: "desc" },
  });
  return rows.map(toPurchaseBill);
};

export const getPurchaseBill = async (
  id: string,
  organizationId: string,
): Promise<PurchaseBill | null> => {
  const row = await prisma.purchaseBill.findFirst({
    where: { id, organizationId },
    include: billInclude,
  });
  return row ? toPurchaseBill(row) : null;
};

export const createPurchaseBill = async (
  organizationId: string,
  branchId: string,
  input: NewPurchaseBillInput,
): Promise<PurchaseBill> => {
  if (!input.vendorId) throw new PurchaseBillError("Vendor is required.");
  if (!input.billNo?.trim()) throw new PurchaseBillError("Bill number is required.");
  if (!input.billDate) throw new PurchaseBillError("Bill date is required.");
  if (input.subtotal == null || input.subtotal < 0) {
    throw new PurchaseBillError("Subtotal is required.");
  }
  if (input.total == null || input.total < 0) {
    throw new PurchaseBillError("Total is required.");
  }

  const vendor = await prisma.vendor.findFirst({
    where: { id: input.vendorId, organizationId },
  });
  if (!vendor) throw new PurchaseBillError("Vendor not found.");

  if (input.entryVoucherId) {
    const voucher = await prisma.entryVoucher.findFirst({
      where: { id: input.entryVoucherId, organizationId },
    });
    if (!voucher) throw new PurchaseBillError("Entry voucher not found.");
    const linked = await prisma.purchaseBill.findUnique({
      where: { entryVoucherId: input.entryVoucherId },
    });
    if (linked) throw new PurchaseBillError("Entry voucher is already linked to a bill.");
  }

  const gstAmount = input.gstAmount ?? 0;
  const paidAmount = input.paidAmount ?? 0;
  const total = input.total;
  const status = deriveStatus(total, paidAmount);

  const row = await prisma.purchaseBill.create({
    data: {
      organizationId,
      branchId,
      vendorId: input.vendorId,
      billNo: input.billNo.trim(),
      billDate: new Date(input.billDate),
      entryVoucherId: input.entryVoucherId || null,
      subtotal: toMoney(input.subtotal),
      gstAmount: toMoney(gstAmount),
      total: toMoney(total),
      paidAmount: toMoney(paidAmount),
      status,
    },
    include: billInclude,
  });
  return toPurchaseBill(row);
};

export const updatePurchaseBill = async (
  id: string,
  organizationId: string,
  input: UpdatePurchaseBillInput,
): Promise<PurchaseBill> => {
  const existing = await prisma.purchaseBill.findFirst({
    where: { id, organizationId },
  });
  if (!existing) throw new PurchaseBillError("Purchase bill not found.", 404);

  const subtotal =
    input.subtotal !== undefined ? input.subtotal : moneyToNumber(existing.subtotal);
  const gstAmount =
    input.gstAmount !== undefined ? input.gstAmount : moneyToNumber(existing.gstAmount);
  const total = input.total !== undefined ? input.total : moneyToNumber(existing.total);
  const paidAmount =
    input.paidAmount !== undefined ? input.paidAmount : moneyToNumber(existing.paidAmount);

  const row = await prisma.purchaseBill.update({
    where: { id },
    data: {
      billNo: input.billNo?.trim(),
      billDate: input.billDate ? new Date(input.billDate) : undefined,
      subtotal: input.subtotal !== undefined ? toMoney(subtotal) : undefined,
      gstAmount: input.gstAmount !== undefined ? toMoney(gstAmount) : undefined,
      total: input.total !== undefined ? toMoney(total) : undefined,
      paidAmount: input.paidAmount !== undefined ? toMoney(paidAmount) : undefined,
      status: deriveStatus(total, paidAmount),
    },
    include: billInclude,
  });
  return toPurchaseBill(row);
};
