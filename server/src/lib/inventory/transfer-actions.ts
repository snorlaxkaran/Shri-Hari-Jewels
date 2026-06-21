import {
  InventoryUnitStatus,
  StockTransferStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../db.js";
import type { Branch, StockTransfer as DbStockTransfer, StockTransferItem as DbStockTransferItem } from "@prisma/client";
import type { StockTransfer } from "../../types.js";
import { moneyToNumber } from "../money.js";
import { syncProductStockInTx } from "./stock-sync.js";
import { recordInventoryAuditInTx } from "./audit.js";
import { InventoryError } from "./service.js";

type StockTransferWithRelations = DbStockTransfer & {
  fromBranch: Branch;
  toBranch: Branch;
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
  toBranchName: transfer.toBranch.name,
  documentType: transfer.documentType as StockTransfer["documentType"],
  transferDate: transfer.transferDate.toISOString(),
  itemCount: transfer.itemCount,
  totalValue: moneyToNumber(transfer.totalValue),
  status: transfer.status,
  notes: transfer.notes ?? undefined,
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
  })),
});

const transferInclude = {
  fromBranch: true,
  toBranch: true,
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
  branchId: string,
  status?: StockTransferStatus,
): Promise<StockTransfer[]> => {
  const transfers = await prisma.stockTransfer.findMany({
    where: {
      toBranchId: branchId,
      ...(status ? { status } : {}),
    },
    include: transferInclude,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return transfers.map(toStockTransferDto);
};

export const listSentStockTransfers = async (
  fromBranchId?: string,
): Promise<StockTransfer[]> => {
  const transfers = await prisma.stockTransfer.findMany({
    where: fromBranchId ? { fromBranchId } : undefined,
    include: transferInclude,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return transfers.map(toStockTransferDto);
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
    await tx.inventoryUnit.updateMany({
      where: { itemCode: { in: itemCodes } },
      data: {
        branchId: transfer.toBranchId,
        status: InventoryUnitStatus.Available,
      },
    });

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
    await tx.inventoryUnit.updateMany({
      where: { itemCode: { in: itemCodes } },
      data: { status: InventoryUnitStatus.Available },
    });

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
    if (accepted.length > 0) {
      await tx.inventoryUnit.updateMany({
        where: { itemCode: { in: accepted } },
        data: {
          branchId: transfer.toBranchId,
          status: InventoryUnitStatus.Available,
        },
      });
    }

    if (rejected.length > 0) {
      await tx.inventoryUnit.updateMany({
        where: { itemCode: { in: rejected } },
        data: { status: InventoryUnitStatus.Available },
      });
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
    await tx.inventoryUnit.updateMany({
      where: { itemCode: { in: itemCodes } },
      data: { status: InventoryUnitStatus.Available },
    });

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

    return tx.stockTransfer.findUniqueOrThrow({
      where: { id: transfer.id },
      include: transferInclude,
    });
  });

  return toStockTransferDto(updated);
};

export const countPendingIncomingTransfers = async (
  branchId: string,
): Promise<number> =>
  prisma.stockTransfer.count({
    where: { toBranchId: branchId, status: StockTransferStatus.Pending },
  });
