import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

type TransactionClient = Prisma.TransactionClient;

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
