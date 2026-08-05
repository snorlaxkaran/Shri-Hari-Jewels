import {
  InventoryUnitStatus,
  StockAuditStatus,
  type Prisma,
  type StockAuditMetalGroup,
} from "@prisma/client";
import { prisma } from "../db.js";
import { InventoryError } from "./service.js";
import {
  productMetalMatchesAuditGroup,
  prismaMetalFilterForAuditGroup,
  stockAuditMetalLabel,
} from "./stock-audit-metal.js";
import type {
  StockAuditPendingItem,
  StockAuditScanItem,
  StockAuditSession,
} from "../../types.js";

const AUDITABLE_STATUSES: InventoryUnitStatus[] = [
  InventoryUnitStatus.Available,
  InventoryUnitStatus.Reserved,
  InventoryUnitStatus.PendingVerification,
];

const sessionSummaryInclude = {
  _count: { select: { scans: true } },
} satisfies Prisma.StockAuditSessionInclude;

const sessionScanInclude = {
  scans: {
    orderBy: { scannedAt: "desc" as const },
    include: {
      inventoryUnit: {
        include: {
          product: {
            select: {
              name: true,
              imageColor: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.StockAuditSessionInclude;

type SessionSummaryRow = Prisma.StockAuditSessionGetPayload<{
  include: typeof sessionSummaryInclude;
}>;

type SessionScanRow = Prisma.StockAuditSessionGetPayload<{
  include: typeof sessionScanInclude;
}>;

type SessionExtras = {
  scans?: StockAuditScanItem[];
  lastScan?: StockAuditScanItem;
};

const toScanDto = (
  scan: SessionScanRow["scans"][number],
): StockAuditScanItem => ({
  id: scan.id,
  itemCode: scan.itemCode,
  productName: scan.inventoryUnit.product.name,
  imageUrl: scan.inventoryUnit.product.images[0]?.url,
  imageColor: scan.inventoryUnit.product.imageColor ?? undefined,
  scannedByName: scan.scannedByName,
  scannedAt: scan.scannedAt.toISOString(),
});

const toSessionDto = (
  session: SessionSummaryRow,
  extras: SessionExtras = {},
): StockAuditSession => {
  const counted = session._count.scans;
  return {
    id: session.id,
    branchId: session.branchId,
    metalGroup: session.metalGroup as StockAuditSession["metalGroup"],
    metalLabel: stockAuditMetalLabel(
      session.metalGroup as StockAuditSession["metalGroup"],
    ),
    status: session.status as StockAuditSession["status"],
    expectedCount: session.expectedCount,
    counted,
    pending: Math.max(0, session.expectedCount - counted),
    startedById: session.startedById,
    startedByName: session.startedByName,
    createdAt: session.createdAt.toISOString(),
    closedAt: session.closedAt?.toISOString(),
    scans: extras.scans ?? [],
    lastScan: extras.lastScan,
  };
};

const auditableUnitWhere = (
  organizationId: string,
  branchId: string,
  metalGroup: StockAuditMetalGroup,
): Prisma.InventoryUnitWhereInput => ({
  organizationId,
  branchId,
  status: { in: AUDITABLE_STATUSES },
  product: {
    metal: prismaMetalFilterForAuditGroup(metalGroup),
  },
});

const countExpectedUnits = async (
  organizationId: string,
  branchId: string,
  metalGroup: StockAuditMetalGroup,
): Promise<number> =>
  prisma.inventoryUnit.count({
    where: auditableUnitWhere(organizationId, branchId, metalGroup),
  });

const fetchSessionSummary = async (
  sessionId: string,
  organizationId: string,
  branchId?: string,
): Promise<SessionSummaryRow | null> =>
  prisma.stockAuditSession.findFirst({
    where: {
      id: sessionId,
      organizationId,
      ...(branchId ? { branchId } : {}),
    },
    include: sessionSummaryInclude,
  });

export const listStockAuditSessions = async (
  organizationId: string,
  branchId: string,
  metalGroup?: StockAuditMetalGroup,
): Promise<StockAuditSession[]> => {
  const sessions = await prisma.stockAuditSession.findMany({
    where: {
      organizationId,
      branchId,
      ...(metalGroup ? { metalGroup } : {}),
    },
    include: sessionSummaryInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return sessions.map((session) => toSessionDto(session));
};

export const getStockAuditSession = async (
  sessionId: string,
  organizationId: string,
  branchId?: string,
  options?: { includeScans?: boolean },
): Promise<StockAuditSession | null> => {
  if (options?.includeScans) {
    const session = await prisma.stockAuditSession.findFirst({
      where: {
        id: sessionId,
        organizationId,
        ...(branchId ? { branchId } : {}),
      },
      include: sessionScanInclude,
    });
    if (!session) return null;
    const counted = session.scans.length;
    return {
      id: session.id,
      branchId: session.branchId,
      metalGroup: session.metalGroup as StockAuditSession["metalGroup"],
      metalLabel: stockAuditMetalLabel(
        session.metalGroup as StockAuditSession["metalGroup"],
      ),
      status: session.status as StockAuditSession["status"],
      expectedCount: session.expectedCount,
      counted,
      pending: Math.max(0, session.expectedCount - counted),
      startedById: session.startedById,
      startedByName: session.startedByName,
      createdAt: session.createdAt.toISOString(),
      closedAt: session.closedAt?.toISOString(),
      scans: session.scans.map(toScanDto),
    };
  }

  const session = await fetchSessionSummary(sessionId, organizationId, branchId);
  return session ? toSessionDto(session) : null;
};

export const listStockAuditPendingItems = async (
  sessionId: string,
  organizationId: string,
  branchId: string,
): Promise<StockAuditPendingItem[]> => {
  const session = await prisma.stockAuditSession.findFirst({
    where: { id: sessionId, organizationId, branchId },
    select: { metalGroup: true },
  });
  if (!session) {
    throw new InventoryError("Audit session not found.", 404);
  }

  const units = await prisma.inventoryUnit.findMany({
    where: {
      ...auditableUnitWhere(organizationId, branchId, session.metalGroup),
      stockAuditScans: {
        none: { sessionId },
      },
    },
    include: {
      product: {
        select: {
          name: true,
          sku: true,
          category: true,
          metal: true,
          purity: true,
          weightGrams: true,
        },
      },
    },
    orderBy: { itemCode: "asc" },
  });

  return units.map((unit) => ({
    itemCode: unit.itemCode,
    productName: unit.product.name,
    sku: unit.product.sku,
    category: unit.product.category,
    metal: unit.product.metal,
    purity: unit.product.purity,
    weightGrams: Number(unit.product.weightGrams),
    status: unit.status,
  }));
};

export const createStockAuditSession = async (
  organizationId: string,
  branchId: string,
  metalGroup: StockAuditMetalGroup,
  actor: { id: string; name: string },
): Promise<StockAuditSession> => {
  const openSession = await prisma.stockAuditSession.findFirst({
    where: {
      organizationId,
      branchId,
      metalGroup,
      status: StockAuditStatus.Open,
    },
    select: { id: true },
  });
  if (openSession) {
    throw new InventoryError(
      `An open ${stockAuditMetalLabel(metalGroup)} audit is already in progress.`,
      409,
    );
  }

  const expectedCount = await countExpectedUnits(
    organizationId,
    branchId,
    metalGroup,
  );

  const session = await prisma.stockAuditSession.create({
    data: {
      organizationId,
      branchId,
      metalGroup,
      expectedCount,
      startedById: actor.id,
      startedByName: actor.name,
    },
    include: sessionSummaryInclude,
  });

  return toSessionDto(session);
};

export const scanStockAuditItem = async (
  sessionId: string,
  itemCode: string,
  organizationId: string,
  branchId: string,
  actor: { id: string; name: string },
): Promise<StockAuditSession> => {
  const code = itemCode.trim();
  if (!code) {
    throw new InventoryError("Scan an item code.", 400);
  }

  const session = await fetchSessionSummary(sessionId, organizationId, branchId);
  if (!session) {
    throw new InventoryError("Audit session not found.", 404);
  }
  if (session.status !== StockAuditStatus.Open) {
    throw new InventoryError("This audit session is closed.", 400);
  }

  const existingScan = await prisma.stockAuditScan.findFirst({
    where: {
      sessionId: session.id,
      itemCode: { equals: code, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (existingScan) {
    throw new InventoryError(`${code} has already been scanned in this audit.`, 409);
  }

  const unit = await prisma.inventoryUnit.findFirst({
    where: {
      organizationId,
      itemCode: { equals: code, mode: "insensitive" },
    },
    include: { product: true },
  });
  if (!unit) {
    throw new InventoryError(`Item code not found: ${code}`, 404);
  }
  if (unit.branchId !== branchId) {
    throw new InventoryError(`${code} is not at your branch.`, 403);
  }
  if (!AUDITABLE_STATUSES.includes(unit.status)) {
    throw new InventoryError(
      `${code} is ${unit.status} and cannot be counted in a stock audit.`,
      400,
    );
  }
  if (
    !productMetalMatchesAuditGroup(unit.product.metal, session.metalGroup)
  ) {
    throw new InventoryError(
      `${code} is ${unit.product.metal} — it cannot be scanned in a ${stockAuditMetalLabel(session.metalGroup)} audit.`,
      400,
    );
  }

  const createdScan = await prisma.stockAuditScan.create({
    data: {
      sessionId: session.id,
      inventoryUnitId: unit.id,
      itemCode: unit.itemCode,
      scannedById: actor.id,
      scannedByName: actor.name,
    },
    include: {
      inventoryUnit: {
        include: {
          product: {
            select: {
              name: true,
              imageColor: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
        },
      },
    },
  });

  const updated = await fetchSessionSummary(session.id, organizationId, branchId);
  if (!updated) {
    throw new InventoryError("Audit session not found.", 404);
  }

  return toSessionDto(updated, {
    lastScan: toScanDto(createdScan),
  });
};

export const closeStockAuditSession = async (
  sessionId: string,
  organizationId: string,
  branchId: string,
): Promise<StockAuditSession> => {
  const session = await fetchSessionSummary(sessionId, organizationId, branchId);
  if (!session) {
    throw new InventoryError("Audit session not found.", 404);
  }
  if (session.status === StockAuditStatus.Closed) {
    return toSessionDto(session);
  }

  const updated = await prisma.stockAuditSession.update({
    where: { id: session.id },
    data: {
      status: StockAuditStatus.Closed,
      closedAt: new Date(),
    },
    include: sessionSummaryInclude,
  });
  return toSessionDto(updated);
};
