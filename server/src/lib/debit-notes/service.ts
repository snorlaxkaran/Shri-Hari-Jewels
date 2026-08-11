import type { Prisma } from "@prisma/client";
import { InventoryUnitStatus } from "@prisma/client";
import { prisma } from "../db.js";
import type { DebitNote, NewDebitNoteInput } from "../../types.js";
import { syncProductStockInTx } from "../inventory/stock-sync.js";
import { recordInventoryAuditInTx } from "../inventory/audit.js";
import { generateDebitNoteNo } from "./note-no.js";
import { isDebitNoteReason } from "./reasons.js";
import { moneyToNumber, toMoney } from "../money.js";

export class DebitNoteError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "DebitNoteError";
  }
}

const billInclude = {
  vendor: { select: { id: true, name: true } },
  entryVoucher: { select: { id: true, voucherCode: true } },
} as const;

const debitNoteInclude = {
  vendor: { select: { id: true, name: true } },
  purchaseBill: { select: { billNo: true, total: true } },
  entryVoucher: { select: { id: true, voucherCode: true } },
} as const;

const deriveBillStatus = (total: number, paidAmount: number): string => {
  if (paidAmount <= 0) return "Unpaid";
  if (paidAmount >= total) return "Paid";
  return "Partially Paid";
};

const toDebitNote = (row: {
  id: string;
  organizationId: string;
  branchId: string;
  debitNoteNo: string;
  purchaseBillId: string;
  vendorId: string;
  entryVoucherId: string | null;
  reason: string;
  reasonText: string | null;
  subtotal: { toString(): string };
  gstAmount: { toString(): string };
  total: { toString(): string };
  status: string;
  createdByName: string;
  createdAt: Date;
  vendor?: { id: string; name: string };
  purchaseBill?: { billNo: string; total: { toString(): string } };
  entryVoucher?: { id: string; voucherCode: string } | null;
}): DebitNote => ({
  id: row.id,
  organizationId: row.organizationId,
  branchId: row.branchId,
  debitNoteNo: row.debitNoteNo,
  purchaseBillId: row.purchaseBillId,
  purchaseBillNo: row.purchaseBill?.billNo,
  vendorId: row.vendorId,
  vendorName: row.vendor?.name,
  entryVoucherId: row.entryVoucherId ?? undefined,
  entryVoucherCode: row.entryVoucher?.voucherCode,
  reason: row.reason,
  reasonText: row.reasonText ?? undefined,
  subtotal: moneyToNumber(row.subtotal.toString()),
  gstAmount: moneyToNumber(row.gstAmount.toString()),
  total: moneyToNumber(row.total.toString()),
  status: row.status,
  createdByName: row.createdByName,
  createdAt: row.createdAt.toISOString(),
  billTotal: row.purchaseBill ? moneyToNumber(row.purchaseBill.total.toString()) : undefined,
});

const nextDebitNoteNoInTx = async (
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `DBN-${year}-`;
  const latest = await tx.debitNote.findFirst({
    where: { organizationId, debitNoteNo: { startsWith: prefix } },
    orderBy: { debitNoteNo: "desc" },
    select: { debitNoteNo: true },
  });
  return generateDebitNoteNo(latest ? [latest.debitNoteNo] : []);
};

export const listDebitNotes = async (
  organizationId: string,
  branchId?: string,
): Promise<DebitNote[]> => {
  const rows = await prisma.debitNote.findMany({
    where: {
      organizationId,
      ...(branchId ? { branchId } : {}),
    },
    include: debitNoteInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDebitNote);
};

export const getDebitNote = async (
  id: string,
  organizationId: string,
): Promise<DebitNote | null> => {
  const row = await prisma.debitNote.findFirst({
    where: { id, organizationId },
    include: debitNoteInclude,
  });
  return row ? toDebitNote(row) : null;
};

export const listDebitNotesForBill = async (
  purchaseBillId: string,
  organizationId: string,
): Promise<DebitNote[]> => {
  const rows = await prisma.debitNote.findMany({
    where: { purchaseBillId, organizationId },
    include: debitNoteInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDebitNote);
};

export type DebitNoteActor = {
  id?: string;
  name: string;
};

const reverseEntryVoucherStockInTx = async (
  tx: Prisma.TransactionClient,
  voucherId: string,
  organizationId: string,
  actor: DebitNoteActor,
  debitNoteNo: string,
): Promise<void> => {
  const voucher = await tx.entryVoucher.findFirst({
    where: { id: voucherId, organizationId },
    include: {
      units: {
        select: {
          id: true,
          itemCode: true,
          productId: true,
          status: true,
        },
      },
    },
  });
  if (!voucher) throw new DebitNoteError("Entry voucher not found.");

  const returnableStatuses: InventoryUnitStatus[] = [
    InventoryUnitStatus.Available,
    InventoryUnitStatus.PendingVerification,
  ];

  const unitsToRemove = voucher.units.filter((unit) =>
    returnableStatuses.includes(unit.status),
  );

  if (unitsToRemove.length === 0) return;

  const productIds = [...new Set(unitsToRemove.map((unit) => unit.productId))];

  await tx.inventoryUnit.deleteMany({
    where: { id: { in: unitsToRemove.map((unit) => unit.id) } },
  });

  for (const productId of productIds) {
    await syncProductStockInTx(tx, productId, {
      reason: "debit_note_vendor_return",
      performedById: actor.id,
      performedByName: actor.name,
    });
  }

  await recordInventoryAuditInTx(tx, {
    entityType: "InventoryUnit",
    entityId: voucher.id,
    action: "VoucherDeleted",
    newValue: {
      voucherCode: voucher.voucherCode,
      itemCount: unitsToRemove.length,
      debitNoteNo,
    },
    reason: "debit_note_vendor_return",
    performedById: actor.id,
    performedByName: actor.name,
  });
};

export const issueDebitNote = async (
  organizationId: string,
  branchId: string,
  actor: DebitNoteActor,
  input: NewDebitNoteInput,
): Promise<DebitNote> => {
  if (!input.purchaseBillId) {
    throw new DebitNoteError("Purchase bill is required.");
  }
  if (!isDebitNoteReason(input.reason)) {
    throw new DebitNoteError("Invalid debit note reason.");
  }
  if (input.reason === "Other" && !input.reasonText?.trim()) {
    throw new DebitNoteError("Reason details are required when reason is Other.");
  }
  if (input.subtotal == null || input.subtotal < 0) {
    throw new DebitNoteError("Subtotal is required.");
  }
  if (input.total == null || input.total <= 0) {
    throw new DebitNoteError("Total must be greater than zero.");
  }

  const bill = await prisma.purchaseBill.findFirst({
    where: { id: input.purchaseBillId, organizationId },
    include: billInclude,
  });
  if (!bill) throw new DebitNoteError("Purchase bill not found.", 404);

  const billTotal = moneyToNumber(bill.total);
  const debitedTotal = moneyToNumber(bill.debitedTotal);
  const newDebitedTotal = moneyToNumber(toMoney(debitedTotal + input.total));
  if (newDebitedTotal > billTotal + 0.01) {
    throw new DebitNoteError("Debit note total exceeds purchase bill total.");
  }

  const entryVoucherId = input.entryVoucherId || bill.entryVoucherId || undefined;
  if (entryVoucherId) {
    const voucher = await prisma.entryVoucher.findFirst({
      where: { id: entryVoucherId, organizationId },
    });
    if (!voucher) throw new DebitNoteError("Entry voucher not found.");
  }

  const gstAmount = input.gstAmount ?? 0;
  const adjustedBillTotal = moneyToNumber(toMoney(billTotal - input.total));
  const paidAmount = moneyToNumber(bill.paidAmount);
  const adjustedPaid = Math.min(paidAmount, adjustedBillTotal);
  const nextStatus = deriveBillStatus(adjustedBillTotal, adjustedPaid);

  const note = await prisma.$transaction(async (tx) => {
    const debitNoteNo = await nextDebitNoteNoInTx(tx, organizationId);

    const created = await tx.debitNote.create({
      data: {
        organizationId,
        branchId: bill.branchId,
        debitNoteNo,
        purchaseBillId: bill.id,
        vendorId: bill.vendorId,
        entryVoucherId: entryVoucherId ?? null,
        reason: input.reason,
        reasonText: input.reasonText?.trim() || null,
        subtotal: toMoney(input.subtotal),
        gstAmount: toMoney(gstAmount),
        total: toMoney(input.total),
        createdById: actor.id,
        createdByName: actor.name,
      },
      include: debitNoteInclude,
    });

    await tx.purchaseBill.update({
      where: { id: bill.id },
      data: {
        debitedTotal: toMoney(newDebitedTotal),
        total: toMoney(adjustedBillTotal),
        subtotal: toMoney(Math.max(0, moneyToNumber(bill.subtotal) - input.subtotal)),
        gstAmount: toMoney(Math.max(0, moneyToNumber(bill.gstAmount) - gstAmount)),
        paidAmount: toMoney(adjustedPaid),
        status: nextStatus,
      },
    });

    if (entryVoucherId) {
      await reverseEntryVoucherStockInTx(
        tx,
        entryVoucherId,
        organizationId,
        actor,
        debitNoteNo,
      );
    }

    return created;
  });

  return toDebitNote(note);
};
