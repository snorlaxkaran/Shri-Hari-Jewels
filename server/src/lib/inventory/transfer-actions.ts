import {
  InventoryUnitStatus,
  StockTransferStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../db.js";
import {
  organizationTransferFromFilter,
  organizationTransferToFilter,
} from "../branches/access.js";
import type { Branch, StockTransfer as DbStockTransfer, StockTransferItem as DbStockTransferItem } from "@prisma/client";
import type { StockTransfer } from "../../types.js";
import { moneyToNumber } from "../money.js";
import { syncProductStockInTx } from "./stock-sync.js";
import { recordInventoryAuditInTx, recordUnitTransferAcceptedInTx, recordUnitTransferReturnedInTx } from "./audit.js";
import { InventoryError } from "./service.js";
import { generateTransferInvoiceNo } from "../invoices/transfer-invoice-no.js";
import { generateTransferInvoicePdf } from "../invoices/transfer-invoice-pdf.js";
import { getShopSettings } from "../settings/service.js";

type StockTransferWithRelations = DbStockTransfer & {
  fromBranch: Branch;
  toBranch: Branch;
  customer?: { name: string } | null;
  customerBranch?: { name: string } | null;
  items: DbStockTransferItem[];
};

export const toStockTransferDto = (
  transfer: StockTransferWithRelations,
): StockTransfer => ({
  id: transfer.id,
  transferNo: transfer.transferNo,
  fromBranchId: transfer.fromBranchId,
  fromBranchName: transfer.fromBranch.name,
  toBranchId: transfer.toBranchId,
  toBranchName:
    transfer.customerBranch?.name ??
    transfer.customer?.name ??
    transfer.toBranch.name,
  customerId: transfer.customerId ?? undefined,
  customerName: transfer.customer?.name,
  customerBranchId: transfer.customerBranchId ?? undefined,
  customerBranchName: transfer.customerBranch?.name,
  documentType: transfer.documentType as StockTransfer["documentType"],
  transferDate: transfer.transferDate.toISOString(),
  itemCount: transfer.itemCount,
  totalValue: moneyToNumber(transfer.totalValue),
  status: transfer.status,
  notes: transfer.notes ?? undefined,
  recipientGstNumber: transfer.recipientGstNumber ?? undefined,
  recipientGstRegisteredName: transfer.recipientGstRegisteredName ?? undefined,
  recipientPanNumber: transfer.recipientPanNumber ?? undefined,
  recipientEmail: transfer.recipientEmail ?? undefined,
  recipientPhone: transfer.recipientPhone ?? undefined,
  recipientAddress: transfer.recipientAddress ?? undefined,
  placeOfSupplyState: transfer.placeOfSupplyState ?? undefined,
  placeOfSupplyStateCode: transfer.placeOfSupplyStateCode ?? undefined,
  placeOfDeliveryState: transfer.placeOfDeliveryState ?? undefined,
  placeOfDeliveryStateCode: transfer.placeOfDeliveryStateCode ?? undefined,
  contactPersonName: transfer.contactPersonName ?? undefined,
  contactPersonPhone: transfer.contactPersonPhone ?? undefined,
  courierCompany: transfer.courierCompany ?? undefined,
  dispatchDate: transfer.dispatchDate?.toISOString(),
  invoiceNo: transfer.invoiceNo ?? undefined,
  invoicedAt: transfer.invoicedAt?.toISOString(),
  acceptedById: transfer.acceptedById ?? undefined,
  acceptedByName: transfer.acceptedByName ?? undefined,
  acceptedAt: transfer.acceptedAt?.toISOString(),
  rejectionReason: transfer.rejectionReason ?? undefined,
  createdByName: transfer.createdByName,
  createdAt: transfer.createdAt.toISOString(),
  items: transfer.items.map((item) => ({
    id: item.id,
    itemCode: item.itemCode,
    productId: item.productId,
    productName: item.productName,
    sku: item.sku,
    metal: item.metal,
    purity: item.purity,
    price: moneyToNumber(item.price),
    accepted: item.accepted,
    weightGrams: item.weightGrams ? Number(item.weightGrams) : undefined,
  })),
});

const transferInclude = {
  fromBranch: true,
  toBranch: true,
  customer: true,
  customerBranch: true,
  items: { orderBy: { itemCode: "asc" as const } },
};

const loadTransfer = async (id: string) =>
  prisma.stockTransfer.findUnique({
    where: { id },
    include: transferInclude,
  });

const assertPendingForBranch = (
  transfer: StockTransferWithRelations,
  branchId: string,
) => {
  if (transfer.status !== StockTransferStatus.Pending) {
    throw new InventoryError(
      `Transfer ${transfer.transferNo} is already ${transfer.status}.`,
      400,
    );
  }
  if (transfer.toBranchId !== branchId) {
    throw new InventoryError(
      "This transfer is not addressed to your branch.",
      403,
    );
  }
};

const syncProductsForItemCodes = async (
  tx: Prisma.TransactionClient,
  itemCodes: string[],
  audit: {
    performedById?: string;
    performedByName: string;
    reason: string;
  },
) => {
  const units = await tx.inventoryUnit.findMany({
    where: { itemCode: { in: itemCodes } },
    select: { productId: true },
  });
  const productIds = [...new Set(units.map((unit) => unit.productId))];
  for (const productId of productIds) {
    await syncProductStockInTx(tx, productId, audit);
  }
};

export const getStockTransferById = async (
  id: string,
): Promise<StockTransfer | null> => {
  const transfer = await loadTransfer(id);
  return transfer ? toStockTransferDto(transfer) : null;
};

export const listIncomingStockTransfers = async (
  organizationId: string,
  branchId: string,
  status?: StockTransferStatus,
): Promise<StockTransfer[]> => {
  const transfers = await prisma.stockTransfer.findMany({
    where: {
      ...organizationTransferToFilter(organizationId, branchId),
      customerBranchId: null,
      ...(status ? { status } : {}),
    },
    include: transferInclude,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return transfers.map(toStockTransferDto);
};

export const listSentStockTransfers = async (
  organizationId: string,
  fromBranchId?: string,
): Promise<StockTransfer[]> => {
  const transfers = await prisma.stockTransfer.findMany({
    where: organizationTransferFromFilter(organizationId, fromBranchId),
    include: transferInclude,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return transfers.map(toStockTransferDto);
};

/** All outbound transfers for proforma list (pagination TODO when volume grows). */
export const listAllTransfersForProforma = async (
  organizationId: string,
  fromBranchId?: string,
): Promise<StockTransfer[]> => {
  const transfers = await prisma.stockTransfer.findMany({
    where: organizationTransferFromFilter(organizationId, fromBranchId),
    include: transferInclude,
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  return transfers.map(toStockTransferDto);
};

export const regenerateTransferInvoicePdf = async (
  transferId: string,
  organizationId: string,
): Promise<{ transfer: StockTransfer; pdfBuffer: Buffer }> => {
  const dbTransfer = await loadTransfer(transferId);
  if (!dbTransfer) throw new InventoryError("Transfer not found.", 404);

  const settings = await getShopSettings(organizationId);
  const pdfBuffer = await generateTransferInvoicePdf(
    dbTransfer,
    settings,
    settings.state ?? "",
  );

  return { transfer: toStockTransferDto(dbTransfer), pdfBuffer };
};

export const acceptStockTransfer = async (
  transferId: string,
  branchId: string,
  actor: { id: string; name: string },
): Promise<StockTransfer> => {
  const transfer = await loadTransfer(transferId);
  if (!transfer) throw new InventoryError("Transfer not found.", 404);
  assertPendingForBranch(transfer, branchId);

  const itemCodes = transfer.items.map((item) => item.itemCode);

  const updated = await prisma.$transaction(async (tx) => {
    const units = await tx.inventoryUnit.findMany({
      where: { itemCode: { in: itemCodes } },
      select: { id: true, itemCode: true, productId: true },
    });

    await tx.inventoryUnit.updateMany({
      where: { itemCode: { in: itemCodes } },
      data: {
        branchId: transfer.toBranchId,
        status: InventoryUnitStatus.Available,
      },
    });

    for (const unit of units) {
      await recordUnitTransferAcceptedInTx(
        tx,
        { unitId: unit.id, itemCode: unit.itemCode, productId: unit.productId },
        actor,
        {
          transferNo: transfer.transferNo,
          transferId: transfer.id,
          toBranchId: transfer.toBranchId,
        },
      );
    }

    await syncProductsForItemCodes(tx, itemCodes, {
      performedById: actor.id,
      performedByName: actor.name,
      reason: "transfer_accept",
    });

    await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: {
        status: StockTransferStatus.Accepted,
        acceptedById: actor.id,
        acceptedByName: actor.name,
        acceptedAt: new Date(),
      },
    });

    await recordInventoryAuditInTx(tx, {
      entityType: "InventoryUnit",
      entityId: transfer.id,
      action: "TransferAccepted",
      newValue: { transferNo: transfer.transferNo, itemCodes },
      reason: "transfer_accept",
      performedById: actor.id,
      performedByName: actor.name,
    });

    return tx.stockTransfer.findUniqueOrThrow({
      where: { id: transfer.id },
      include: transferInclude,
    });
  });

  return toStockTransferDto(updated);
};

export const rejectStockTransfer = async (
  transferId: string,
  branchId: string,
  actor: { id: string; name: string },
  reason: string,
): Promise<StockTransfer> => {
  const transfer = await loadTransfer(transferId);
  if (!transfer) throw new InventoryError("Transfer not found.", 404);
  assertPendingForBranch(transfer, branchId);

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new InventoryError("Rejection reason is required.");
  }

  const itemCodes = transfer.items.map((item) => item.itemCode);

  const updated = await prisma.$transaction(async (tx) => {
    const units = await tx.inventoryUnit.findMany({
      where: { itemCode: { in: itemCodes } },
      select: { id: true, itemCode: true, productId: true },
    });

    await tx.inventoryUnit.updateMany({
      where: { itemCode: { in: itemCodes } },
      data: { status: InventoryUnitStatus.Available },
    });

    for (const unit of units) {
      await recordUnitTransferReturnedInTx(
        tx,
        { unitId: unit.id, itemCode: unit.itemCode, productId: unit.productId },
        actor, {
        transferNo: transfer.transferNo,
        transferId: transfer.id,
        reason: trimmedReason,
      });
    }

    await tx.stockTransferItem.updateMany({
      where: { transferId: transfer.id },
      data: { accepted: false },
    });

    await syncProductsForItemCodes(tx, itemCodes, {
      performedById: actor.id,
      performedByName: actor.name,
      reason: "transfer_reject",
    });

    await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: {
        status: StockTransferStatus.Rejected,
        rejectionReason: trimmedReason,
        acceptedById: actor.id,
        acceptedByName: actor.name,
        acceptedAt: new Date(),
      },
    });

    await recordInventoryAuditInTx(tx, {
      entityType: "InventoryUnit",
      entityId: transfer.id,
      action: "TransferRejected",
      newValue: { transferNo: transfer.transferNo, reason: trimmedReason },
      reason: "transfer_reject",
      performedById: actor.id,
      performedByName: actor.name,
    });

    return tx.stockTransfer.findUniqueOrThrow({
      where: { id: transfer.id },
      include: transferInclude,
    });
  });

  return toStockTransferDto(updated);
};

export const partialAcceptStockTransfer = async (
  transferId: string,
  branchId: string,
  actor: { id: string; name: string },
  input: { accepted: string[]; rejected: string[]; reason?: string },
): Promise<StockTransfer> => {
  const transfer = await loadTransfer(transferId);
  if (!transfer) throw new InventoryError("Transfer not found.", 404);
  assertPendingForBranch(transfer, branchId);

  const allCodes = new Set(transfer.items.map((item) => item.itemCode));
  const accepted = [...new Set(input.accepted.map((c) => c.trim()).filter(Boolean))];
  const rejected = [...new Set(input.rejected.map((c) => c.trim()).filter(Boolean))];

  if (accepted.length === 0) {
    throw new InventoryError("Select at least one item to accept.");
  }

  for (const code of [...accepted, ...rejected]) {
    if (!allCodes.has(code)) {
      throw new InventoryError(`Item ${code} is not part of this transfer.`);
    }
  }

  const overlap = accepted.find((code) => rejected.includes(code));
  if (overlap) {
    throw new InventoryError(`Item ${overlap} cannot be both accepted and rejected.`);
  }

  if (accepted.length + rejected.length !== allCodes.size) {
    throw new InventoryError("Every item must be marked accepted or rejected.");
  }

  if (rejected.length > 0 && !input.reason?.trim()) {
    throw new InventoryError("Rejection reason is required for rejected items.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const allUnits = await tx.inventoryUnit.findMany({
      where: { itemCode: { in: [...accepted, ...rejected] } },
      select: { id: true, itemCode: true, productId: true },
    });
    const unitByCode = new Map(allUnits.map((unit) => [unit.itemCode, unit]));

    if (accepted.length > 0) {
      await tx.inventoryUnit.updateMany({
        where: { itemCode: { in: accepted } },
        data: {
          branchId: transfer.toBranchId,
          status: InventoryUnitStatus.Available,
        },
      });

      for (const code of accepted) {
        const unit = unitByCode.get(code);
        if (!unit) continue;
        await recordUnitTransferAcceptedInTx(
          tx,
          { unitId: unit.id, itemCode: unit.itemCode, productId: unit.productId },
          actor,
          {
            transferNo: transfer.transferNo,
            transferId: transfer.id,
            toBranchId: transfer.toBranchId,
          },
        );
      }
    }

    if (rejected.length > 0) {
      await tx.inventoryUnit.updateMany({
        where: { itemCode: { in: rejected } },
        data: { status: InventoryUnitStatus.Available },
      });

      for (const code of rejected) {
        const unit = unitByCode.get(code);
        if (!unit) continue;
        await recordUnitTransferReturnedInTx(
          tx,
          { unitId: unit.id, itemCode: unit.itemCode, productId: unit.productId },
          actor,
          {
            transferNo: transfer.transferNo,
            transferId: transfer.id,
            reason: input.reason?.trim() || "Partial rejection",
          },
        );
      }
    }

    for (const item of transfer.items) {
      await tx.stockTransferItem.update({
        where: { id: item.id },
        data: { accepted: accepted.includes(item.itemCode) },
      });
    }

    await syncProductsForItemCodes(tx, [...accepted, ...rejected], {
      performedById: actor.id,
      performedByName: actor.name,
      reason: "transfer_partial_accept",
    });

    await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: {
        status: StockTransferStatus.PartiallyAccepted,
        rejectionReason: input.reason?.trim() || null,
        acceptedById: actor.id,
        acceptedByName: actor.name,
        acceptedAt: new Date(),
      },
    });

    await recordInventoryAuditInTx(tx, {
      entityType: "InventoryUnit",
      entityId: transfer.id,
      action: "TransferPartiallyAccepted",
      newValue: { transferNo: transfer.transferNo, accepted, rejected },
      reason: "transfer_partial_accept",
      performedById: actor.id,
      performedByName: actor.name,
    });

    return tx.stockTransfer.findUniqueOrThrow({
      where: { id: transfer.id },
      include: transferInclude,
    });
  });

  return toStockTransferDto(updated);
};

export const cancelStockTransfer = async (
  transferId: string,
  fromBranchId: string,
  actor: { id: string; name: string },
): Promise<StockTransfer> => {
  const transfer = await loadTransfer(transferId);
  if (!transfer) throw new InventoryError("Transfer not found.", 404);

  if (transfer.status !== StockTransferStatus.Pending) {
    throw new InventoryError(
      `Only pending transfers can be cancelled (current: ${transfer.status}).`,
      400,
    );
  }

  if (transfer.fromBranchId !== fromBranchId) {
    throw new InventoryError(
      "You can only cancel transfers sent from your branch.",
      403,
    );
  }

  const itemCodes = transfer.items.map((item) => item.itemCode);

  const updated = await prisma.$transaction(async (tx) => {
    const units = await tx.inventoryUnit.findMany({
      where: { itemCode: { in: itemCodes } },
      select: { id: true, itemCode: true, productId: true },
    });

    await tx.inventoryUnit.updateMany({
      where: { itemCode: { in: itemCodes } },
      data: { status: InventoryUnitStatus.Available },
    });

    for (const unit of units) {
      await recordUnitTransferReturnedInTx(
        tx,
        { unitId: unit.id, itemCode: unit.itemCode, productId: unit.productId },
        actor, {
        transferNo: transfer.transferNo,
        transferId: transfer.id,
        reason: "Cancelled by sender",
      });
    }

    await syncProductsForItemCodes(tx, itemCodes, {
      performedById: actor.id,
      performedByName: actor.name,
      reason: "transfer_cancel",
    });

    await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: {
        status: StockTransferStatus.Rejected,
        rejectionReason: "Cancelled by sender",
        acceptedByName: actor.name,
        acceptedAt: new Date(),
      },
    });

    await recordInventoryAuditInTx(tx, {
      entityType: "InventoryUnit",
      entityId: transfer.id,
      action: "TransferCancelled",
      newValue: { transferNo: transfer.transferNo, itemCodes },
      reason: "transfer_cancel",
      performedById: actor.id,
      performedByName: actor.name,
    });

    return tx.stockTransfer.findUniqueOrThrow({
      where: { id: transfer.id },
      include: transferInclude,
    });
  });

  return toStockTransferDto(updated);
};

export const saveTransferShipping = async (
  transferId: string,
  input: {
    contactPersonName: string;
    contactPersonPhone: string;
    courierCompany: string;
    dispatchDate: string;
  },
): Promise<StockTransfer> => {
  const transfer = await loadTransfer(transferId);
  if (!transfer) throw new InventoryError("Transfer not found.", 404);
  const updated = await prisma.stockTransfer.update({
    where: { id: transferId },
    data: {
      contactPersonName: input.contactPersonName.trim(),
      contactPersonPhone: input.contactPersonPhone.trim(),
      courierCompany: input.courierCompany.trim(),
      dispatchDate: new Date(input.dispatchDate),
    },
    include: {
      fromBranch: true,
      toBranch: true,
      customer: true,
      customerBranch: true,
      items: { orderBy: { itemCode: "asc" } },
    },
  });
  return toStockTransferDto(updated);
};

export const saveTransferShippingAndGenerateInvoice = async (
  transferId: string,
  input: {
    contactPersonName: string;
    contactPersonPhone: string;
    courierCompany: string;
    dispatchDate: string;
  },
  shopState: string,
): Promise<{ transfer: StockTransfer; pdfBuffer: Buffer }> => {
  const transfer = await loadTransfer(transferId);
  if (!transfer) throw new InventoryError("Transfer not found.", 404);

  let invoiceNo = transfer.invoiceNo;
  if (transfer.documentType === "Wholesale GST Invoice" && !invoiceNo) {
    const existing = await prisma.stockTransfer.findMany({
      where: { invoiceNo: { not: null } },
      select: { invoiceNo: true },
    });
    invoiceNo = generateTransferInvoiceNo(
      existing.map((t) => t.invoiceNo!).filter(Boolean),
    );
  }

  const updated = await prisma.stockTransfer.update({
    where: { id: transferId },
    data: {
      contactPersonName: input.contactPersonName.trim(),
      contactPersonPhone: input.contactPersonPhone.trim(),
      courierCompany: input.courierCompany.trim(),
      dispatchDate: new Date(input.dispatchDate),
      invoiceNo: invoiceNo ?? undefined,
      invoicedAt: new Date(),
    },
    include: {
      fromBranch: true,
      toBranch: true,
      customer: true,
      customerBranch: true,
      items: { orderBy: { itemCode: "asc" } },
    },
  });

  const settings = await getShopSettings(updated.fromBranch.organizationId);
  const pdfBuffer = await generateTransferInvoicePdf(updated, settings, shopState);

  return { transfer: toStockTransferDto(updated), pdfBuffer };
};

export const countPendingIncomingTransfers = async (
  branchId: string,
): Promise<number> =>
  prisma.stockTransfer.count({
    where: {
      toBranchId: branchId,
      customerBranchId: null,
      status: StockTransferStatus.Pending,
    },
  });
