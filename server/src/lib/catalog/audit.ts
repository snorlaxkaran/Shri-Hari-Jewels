import { prisma } from "../db.js";

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

export const listCatalogAuditLogs = async (
  entityType?: CatalogEntityType,
  entityId?: string,
) => {
  const rows = await prisma.catalogAuditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((row) => ({
    id: row.id,
    entityType: row.entityType as CatalogEntityType,
    entityId: row.entityId,
    entityRef: row.entityRef ?? undefined,
    action: row.action as CatalogAuditAction,
    previousValue: row.previousValue ?? undefined,
    newValue: row.newValue ?? undefined,
    reason: row.reason ?? undefined,
    performedById: row.performedById ?? undefined,
    performedByName: row.performedByName,
    createdAt: row.createdAt.toISOString(),
  }));
};
