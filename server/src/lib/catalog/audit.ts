import { prisma } from "../db.js";
import { diffValues } from "./diff.js";
import type { FieldDiff } from "./diff.js";

export type CatalogEntityType = "Design" | "Motif" | "DesignElement";

export type CatalogAuditAction =
  | "Create"
  | "Update"
  | "Delete"
  | "Import"
  | "ReplaceElements";

type RecordCatalogAuditInput = {
  entityType: CatalogEntityType;
  entityId: string;
  entityRef?: string;
  action: CatalogAuditAction;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
  performedById?: string;
  performedByName: string;
};

export const recordCatalogAudit = async (
  input: RecordCatalogAuditInput,
): Promise<void> => {
  await prisma.catalogAuditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      entityRef: input.entityRef,
      action: input.action,
      previousValue:
        input.previousValue != null
          ? JSON.stringify(input.previousValue)
          : null,
      newValue:
        input.newValue != null ? JSON.stringify(input.newValue) : null,
      reason: input.reason,
      performedById: input.performedById,
      performedByName: input.performedByName,
    },
  });
};

/** Audit write that never fails the caller's mutation. */
export const safeRecordCatalogAudit = async (
  input: RecordCatalogAuditInput,
): Promise<void> => {
  try {
    await recordCatalogAudit(input);
  } catch (error) {
    console.error(
      `[CatalogAudit] Failed to record ${input.action} on ${input.entityType} ${input.entityId}:`,
      error,
    );
  }
};

export const listCatalogAuditLogs = async (
  entityType?: CatalogEntityType,
  entityId?: string,
  limit = 10,
) => {
  const rows = await prisma.catalogAuditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
  return rows.map((row) => ({
    id: row.id,
    entityType: row.entityType as CatalogEntityType,
    entityId: row.entityId,
    entityRef: row.entityRef ?? undefined,
    action: row.action as CatalogAuditAction,
    previousValue: row.previousValue ?? undefined,
    newValue: row.newValue ?? undefined,
    fieldDiffs: diffValues(row.previousValue, row.newValue) as FieldDiff[],
    reason: row.reason ?? undefined,
    performedById: row.performedById ?? undefined,
    performedByName: row.performedByName,
    createdAt: row.createdAt.toISOString(),
  }));
};

export const getLatestMotifPriceChange = async (
  motifId: string,
): Promise<{ at: string; by: string } | undefined> => {
  const rows = await prisma.catalogAuditLog.findMany({
    where: { entityType: "Motif", entityId: motifId, action: "Update" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  for (const row of rows) {
    const diffs = diffValues(row.previousValue, row.newValue);
    if (diffs.some((d) => d.field === "price")) {
      return {
        at: row.createdAt.toISOString(),
        by: row.performedByName,
      };
    }
  }

  return undefined;
};
