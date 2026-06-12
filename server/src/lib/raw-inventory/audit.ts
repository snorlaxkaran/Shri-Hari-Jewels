import { prisma } from "../db.js";
import type { RawStockAction, RawStockAuditLog } from "../../types.js";

type AuditInput = {
  stockType: "Metal" | "Stone";
  stockId: string;
  lotRef: string;
  action: RawStockAction;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  fromLocation?: string;
  toLocation?: string;
  delta?: number;
  reason?: string;
  performedById?: string;
  performedByName: string;
};

const toAuditLog = (row: {
  id: string;
  stockType: string;
  stockId: string;
  lotRef: string;
  action: string;
  previousValue: string | null;
  newValue: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  delta: number | null;
  reason: string | null;
  performedById: string | null;
  performedByName: string;
  createdAt: Date;
}): RawStockAuditLog => ({
  id: row.id,
  stockType: row.stockType as RawStockAuditLog["stockType"],
  stockId: row.stockId,
  lotRef: row.lotRef,
  action: row.action as RawStockAction,
  previousValue: row.previousValue ?? undefined,
  newValue: row.newValue ?? undefined,
  fromLocation: row.fromLocation ?? undefined,
  toLocation: row.toLocation ?? undefined,
  delta: row.delta ?? undefined,
  reason: row.reason ?? undefined,
  performedById: row.performedById ?? undefined,
  performedByName: row.performedByName,
  createdAt: row.createdAt.toISOString(),
});

export const recordAudit = async (input: AuditInput) => {
  await prisma.rawStockAuditLog.create({
    data: {
      stockType: input.stockType,
      stockId: input.stockId,
      lotRef: input.lotRef,
      action: input.action,
      previousValue: input.previousValue
        ? JSON.stringify(input.previousValue)
        : null,
      newValue: input.newValue ? JSON.stringify(input.newValue) : null,
      fromLocation: input.fromLocation,
      toLocation: input.toLocation,
      delta: input.delta,
      reason: input.reason,
      performedById: input.performedById,
      performedByName: input.performedByName,
    },
  });
};

export const listAuditLogs = async (
  stockType?: "Metal" | "Stone",
  stockId?: string,
): Promise<RawStockAuditLog[]> => {
  const rows = await prisma.rawStockAuditLog.findMany({
    where: {
      ...(stockType ? { stockType } : {}),
      ...(stockId ? { stockId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(toAuditLog);
};
