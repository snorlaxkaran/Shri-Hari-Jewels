import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export type AuditActor = {
  id?: string;
  name: string;
};

export type WriteAuditInput = {
  organizationId?: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  actor: AuditActor;
};

export const writeAuditLog = async (input: WriteAuditInput): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeJson: input.before as Prisma.InputJsonValue | undefined,
      afterJson: input.after as Prisma.InputJsonValue | undefined,
      actorId: input.actor.id,
      actorName: input.actor.name,
    },
  });
};

export const writeAuditLogInTx = async (
  tx: Prisma.TransactionClient,
  input: WriteAuditInput,
): Promise<void> => {
  await tx.auditLog.create({
    data: {
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeJson: input.before as Prisma.InputJsonValue | undefined,
      afterJson: input.after as Prisma.InputJsonValue | undefined,
      actorId: input.actor.id,
      actorName: input.actor.name,
    },
  });
};

export const listAuditLogs = async (filters: {
  organizationId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}) => {
  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: filters.organizationId,
      entityType: filters.entityType,
      entityId: filters.entityId,
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 100,
  });
  return logs.map((log) => ({
    id: log.id,
    organizationId: log.organizationId ?? undefined,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action,
    before: log.beforeJson,
    after: log.afterJson,
    actorId: log.actorId ?? undefined,
    actorName: log.actorName,
    createdAt: log.createdAt.toISOString(),
  }));
};
