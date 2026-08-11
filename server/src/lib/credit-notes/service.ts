import type { Prisma } from "@prisma/client";
import { InventoryUnitStatus } from "@prisma/client";
import { prisma } from "../db.js";
import type { CreditNote, NewCreditNoteInput } from "../../types.js";
import { getShopSettings } from "../settings/service.js";
import { syncProductStockInTx } from "../inventory/stock-sync.js";
import { recordInventoryAuditInTx } from "../inventory/audit.js";
import { recordSaleAuditInTx } from "../sales/audit.js";
import { generateCreditNoteNo } from "./note-no.js";
import { toCreditNote } from "./mappers.js";
import {
  computeCreditNoteTotals,
  scaleLineForPartialCredit,
} from "./gst.js";
import {
  computeRemainingCreditableByItem,
  CreditNoteValidationError,
  deriveInvoiceCreditStatus,
  mapCreditStatusToInvoiceStatus,
  validateCreditNoteLines,
} from "./validation.js";
import {
  isCreditNoteReason,
  isCreditNoteRefundMode,
} from "./reasons.js";
import { moneyToNumber, toMoney } from "../money.js";
import { generateCreditNoteEInvoice } from "../einvoice/credit-note-service.js";

export class CreditNoteError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "CreditNoteError";
  }
}

const creditNoteInclude = {
  items: true,
  invoice: { select: { invoiceNo: true, total: true } },
} as const;

const nextCreditNoteNoInTx = async (
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `CRN-${year}-`;
  const latest = await tx.creditNote.findFirst({
    where: { organizationId, creditNoteNo: { startsWith: prefix } },
    orderBy: { creditNoteNo: "desc" },
    select: { creditNoteNo: true },
  });
  return generateCreditNoteNo(latest ? [latest.creditNoteNo] : []);
};

export const listCreditNotes = async (
  organizationId: string,
  branchId?: string,
): Promise<CreditNote[]> => {
  const rows = await prisma.creditNote.findMany({
    where: {
      organizationId,
      ...(branchId ? { branchId } : {}),
    },
    include: creditNoteInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toCreditNote);
};

export const listCreditNotesForInvoice = async (
  invoiceId: string,
  organizationId: string,
): Promise<CreditNote[]> => {
  const rows = await prisma.creditNote.findMany({
    where: { invoiceId, organizationId },
    include: creditNoteInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toCreditNote);
};

export const getCreditNote = async (
  id: string,
  organizationId: string,
): Promise<CreditNote | null> => {
  const row = await prisma.creditNote.findFirst({
    where: { id, organizationId },
    include: creditNoteInclude,
  });
  return row ? toCreditNote(row) : null;
};

export const getInvoiceCreditSummary = async (
  invoiceId: string,
  organizationId: string,
): Promise<{
  invoiceTotal: number;
  creditedTotal: number;
  remainingCreditable: number;
  remainingByItem: Record<string, number>;
}> => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, branch: { organizationId } },
    include: { items: true },
  });
  if (!invoice) {
    throw new CreditNoteError("Invoice not found.", 404);
  }

  const existingCredits = await prisma.creditNoteItem.findMany({
    where: { invoiceItem: { invoiceId } },
    select: { invoiceItemId: true, amount: true },
  });

  const remainingByItem = computeRemainingCreditableByItem(
    invoice.items.map((item) => ({
      id: item.id,
      amount: moneyToNumber(item.amount),
    })),
    existingCredits.map((item) => ({
      invoiceItemId: item.invoiceItemId,
      amount: moneyToNumber(item.amount),
    })),
  );

  const invoiceTotal = moneyToNumber(invoice.total);
  const creditedTotal = moneyToNumber(invoice.creditedTotal);
  const remainingCreditable = Math.max(0, invoiceTotal - creditedTotal);

  return {
    invoiceTotal,
    creditedTotal,
    remainingCreditable,
    remainingByItem: Object.fromEntries(remainingByItem),
  };
};

export type CreditNoteActor = {
  id?: string;
  name: string;
};

export const issueCreditNote = async (
  organizationId: string,
  actor: CreditNoteActor,
  input: NewCreditNoteInput,
): Promise<CreditNote> => {
  if (!input.invoiceId) throw new CreditNoteError("Invoice is required.");
  if (!isCreditNoteReason(input.reason)) {
    throw new CreditNoteError("Invalid credit note reason.");
  }
  if (input.reason === "Other" && !input.reasonText?.trim()) {
    throw new CreditNoteError("Reason details are required when reason is Other.");
  }
  if (!isCreditNoteRefundMode(input.refundMode)) {
    throw new CreditNoteError("Invalid refund mode.");
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, branch: { organizationId } },
    include: {
      items: true,
      branch: { select: { id: true, organizationId: true } },
    },
  });
  if (!invoice) throw new CreditNoteError("Invoice not found.", 404);

  const existingCredits = await prisma.creditNoteItem.findMany({
    where: { invoiceItem: { invoiceId: invoice.id } },
    select: { invoiceItemId: true, amount: true },
  });

  const remainingByItem = computeRemainingCreditableByItem(
    invoice.items.map((item) => ({
      id: item.id,
      amount: moneyToNumber(item.amount),
    })),
    existingCredits.map((item) => ({
      invoiceItemId: item.invoiceItemId,
      amount: moneyToNumber(item.amount),
    })),
  );

  try {
    validateCreditNoteLines(input.items, remainingByItem);
  } catch (error) {
    if (error instanceof CreditNoteValidationError) {
      throw new CreditNoteError(error.message, error.statusCode);
    }
    throw error;
  }

  const invoiceItemById = new Map(invoice.items.map((item) => [item.id, item]));
  const scaledLines = input.items.map((line) => {
    const invoiceItem = invoiceItemById.get(line.invoiceItemId);
    if (!invoiceItem) throw new CreditNoteError("Invoice item not found.");
    const scaled = scaleLineForPartialCredit(
      {
        listPrice: moneyToNumber(invoiceItem.listPrice),
        discount: moneyToNumber(invoiceItem.discount),
        amount: moneyToNumber(invoiceItem.amount),
      },
      line.amount,
    );
    return {
      invoiceItem,
      returnStock: line.returnStock !== false,
      ...scaled,
    };
  });

  const settings = await getShopSettings(organizationId);
  const totals = computeCreditNoteTotals(
    scaledLines,
    settings.state ?? "",
    invoice.placeOfSupply ?? settings.state ?? "",
  );

  const invoiceTotal = moneyToNumber(invoice.total);
  const newCreditedTotal = moneyToNumber(
    toMoney(moneyToNumber(invoice.creditedTotal) + totals.total),
  );
  if (newCreditedTotal > invoiceTotal + 0.01) {
    throw new CreditNoteError("Credit note total exceeds invoice total.");
  }

  const creditStatus = deriveInvoiceCreditStatus(invoiceTotal, newCreditedTotal);
  const nextStatus = mapCreditStatusToInvoiceStatus(creditStatus, invoice.status);

  const creditNote = await prisma.$transaction(async (tx) => {
    const creditNoteNo = await nextCreditNoteNoInTx(tx, organizationId);

    const created = await tx.creditNote.create({
      data: {
        organizationId,
        branchId: invoice.branchId,
        creditNoteNo,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        customerMobile: invoice.customerMobile,
        reason: input.reason,
        reasonText: input.reasonText?.trim() || null,
        subtotal: toMoney(totals.subtotal),
        discount: toMoney(totals.discount),
        taxableValue: toMoney(totals.taxableValue),
        cgst: toMoney(totals.cgst),
        sgst: toMoney(totals.sgst),
        igst: toMoney(totals.igst),
        roundOff: toMoney(totals.roundOff),
        total: toMoney(totals.total),
        refundMode: input.refundMode,
        refundRef: input.refundRef?.trim() || null,
        placeOfSupply: invoice.placeOfSupply,
        createdById: actor.id,
        createdByName: actor.name,
        items: {
          create: scaledLines.map((line) => ({
            invoiceItemId: line.invoiceItem.id,
            itemCode: line.invoiceItem.itemCode,
            productName: line.invoiceItem.productName,
            sku: line.invoiceItem.sku,
            hsnCode: line.invoiceItem.hsnCode,
            metal: line.invoiceItem.metal,
            listPrice: toMoney(line.listPrice),
            discount: toMoney(line.discount),
            amount: toMoney(line.amount),
            returnStock: line.returnStock,
          })),
        },
      },
      include: creditNoteInclude,
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        creditedTotal: toMoney(newCreditedTotal),
        creditStatus,
        status: nextStatus,
      },
    });

    for (const line of scaledLines) {
      if (!line.returnStock || !line.invoiceItem.saleId) continue;

      const sale = await tx.sale.findUnique({
        where: { id: line.invoiceItem.saleId },
        include: {
          unit: { select: { id: true, status: true, itemCode: true, productId: true } },
        },
      });
      if (!sale?.unit) continue;
      if (sale.unit.status !== InventoryUnitStatus.Sold) continue;

      const previousStatus = sale.unit.status;
      await tx.inventoryUnit.update({
        where: { id: sale.unitId },
        data: { status: InventoryUnitStatus.PendingVerification },
      });

      await syncProductStockInTx(tx, sale.productId, {
        reason: "credit_note_return",
        performedById: actor.id,
        performedByName: actor.name,
        unitId: sale.unitId,
        itemCode: sale.unit.itemCode,
        previousUnitStatus: previousStatus,
        newUnitStatus: InventoryUnitStatus.PendingVerification,
      });

      await recordSaleAuditInTx(tx, {
        saleId: sale.id,
        invoiceId: invoice.id,
        action: "Returned",
        previousValue: { unitStatus: previousStatus },
        newValue: { unitStatus: InventoryUnitStatus.PendingVerification },
        reason: `credit_note:${created.creditNoteNo}`,
        performedById: actor.id,
        performedByName: actor.name,
      });

      await recordInventoryAuditInTx(tx, {
        entityType: "InventoryUnit",
        entityId: sale.unitId,
        action: "StatusChange",
        previousValue: { status: previousStatus },
        newValue: { status: InventoryUnitStatus.PendingVerification },
        reason: `credit_note:${created.creditNoteNo}`,
        performedById: actor.id,
        performedByName: actor.name,
      });
    }

    await recordSaleAuditInTx(tx, {
      invoiceId: invoice.id,
      action: "CreditNoteIssued",
      newValue: {
        creditNoteId: created.id,
        creditNoteNo: created.creditNoteNo,
        total: totals.total,
        refundMode: input.refundMode,
      },
      reason: input.reason,
      performedById: actor.id,
      performedByName: actor.name,
    });

    return created;
  });

  void generateCreditNoteEInvoice({
    organizationId,
    creditNoteId: creditNote.id,
  }).catch(() => undefined);

  return toCreditNote(creditNote);
};
