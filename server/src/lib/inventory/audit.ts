import type { Prisma } from "@prisma/client";
import { InventoryUnitStatus } from "@prisma/client";
import { prisma } from "../db.js";

type TransactionClient = Prisma.TransactionClient;

export type AuditActor = {
  id?: string;
  name: string;
};

const toPerformedBy = (actor: AuditActor) => ({
  performedById: actor.id,
  performedByName: actor.name,
});

export type InventoryAuditInput = {
  entityType: "Product" | "InventoryUnit";
  entityId: string;
  productId?: string;
  itemCode?: string;
  action: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  performedById?: string;
  performedByName: string;
};

const writeLog = async (
  client: TransactionClient | typeof prisma,
  input: InventoryAuditInput,
) => {
  await client.inventoryAuditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      productId: input.productId,
      itemCode: input.itemCode,
      action: input.action,
      previousValue: input.previousValue
        ? JSON.stringify(input.previousValue)
        : null,
      newValue: input.newValue ? JSON.stringify(input.newValue) : null,
      reason: input.reason,
      performedById: input.performedById,
      performedByName: input.performedByName,
    },
  });
};

export const recordInventoryAudit = async (input: InventoryAuditInput) => {
  await writeLog(prisma, input);
};

export const recordInventoryAuditInTx = async (
  tx: TransactionClient,
  input: InventoryAuditInput,
) => {
  await writeLog(tx, input);
};

export const recordUnitsCreatedInTx = async (
  tx: TransactionClient,
  units: Array<{ unitId: string; itemCode: string; productId: string }>,
  actor: AuditActor,
  source: string,
  extra?: Record<string, unknown>,
) => {
  for (const unit of units) {
    await recordInventoryAuditInTx(tx, {
      entityType: "InventoryUnit",
      entityId: unit.unitId,
      productId: unit.productId,
      itemCode: unit.itemCode,
      action: "UnitCreated",
      newValue: { source, ...extra },
      reason: source,
      ...toPerformedBy(actor),
    });
  }
};

export const recordUnitTransferOutInTx = async (
  tx: TransactionClient,
  unit: {
    unitId: string;
    itemCode: string;
    productId: string;
    previousStatus: InventoryUnitStatus;
    newStatus: InventoryUnitStatus;
  },
  actor: AuditActor,
  details: Record<string, unknown>,
) => {
  await recordInventoryAuditInTx(tx, {
    entityType: "InventoryUnit",
    entityId: unit.unitId,
    productId: unit.productId,
    itemCode: unit.itemCode,
    action: "TransferOut",
    previousValue: { status: unit.previousStatus },
    newValue: { status: unit.newStatus, ...details },
    reason: "transfer_out",
    ...toPerformedBy(actor),
  });
};

export const recordUnitTransferReturnedInTx = async (
  tx: TransactionClient,
  unit: { unitId: string; itemCode: string; productId: string },
  actor: AuditActor,
  details: Record<string, unknown>,
) => {
  await recordInventoryAuditInTx(tx, {
    entityType: "InventoryUnit",
    entityId: unit.unitId,
    productId: unit.productId,
    itemCode: unit.itemCode,
    action: "TransferReturned",
    newValue: details,
    reason: "transfer_return",
    ...toPerformedBy(actor),
  });
};

export const recordUnitTransferAcceptedInTx = async (
  tx: TransactionClient,
  unit: { unitId: string; itemCode: string; productId: string },
  actor: AuditActor,
  details: Record<string, unknown>,
) => {
  await recordInventoryAuditInTx(tx, {
    entityType: "InventoryUnit",
    entityId: unit.unitId,
    productId: unit.productId,
    itemCode: unit.itemCode,
    action: "TransferAccepted",
    newValue: details,
    reason: "transfer_accept",
    ...toPerformedBy(actor),
  });
};
