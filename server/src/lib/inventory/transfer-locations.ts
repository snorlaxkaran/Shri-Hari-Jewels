import {
  InventoryUnitStatus,
  StockTransferStatus,
  type InventoryUnitStatus as InventoryUnitStatusType,
} from "@prisma/client";
import { prisma } from "../db.js";

export type UnitBranchTransferLookup = {
  itemCode: string;
  branchId: string;
  status: InventoryUnitStatusType;
};

/** Latest HO-to-branch transfer date per item (for branch-level ageing). */
export const getLatestBranchTransferDateByItemCode = async (
  units: UnitBranchTransferLookup[],
  headOfficeBranchId: string,
): Promise<Map<string, string>> => {
  const branchUnits = units.filter(
    (unit) => unit.branchId !== headOfficeBranchId,
  );
  const itemCodes = [...new Set(branchUnits.map((unit) => unit.itemCode))];
  if (itemCodes.length === 0) return new Map();

  const rows = await prisma.stockTransferItem.findMany({
    where: {
      itemCode: { in: itemCodes },
      transfer: {
        fromBranchId: headOfficeBranchId,
        status: {
          in: [
            StockTransferStatus.Pending,
            StockTransferStatus.Accepted,
            StockTransferStatus.PartiallyAccepted,
          ],
        },
      },
    },
    include: {
      transfer: {
        select: {
          transferDate: true,
          toBranchId: true,
          status: true,
        },
      },
    },
    orderBy: { transfer: { transferDate: "desc" } },
  });

  const unitByCode = new Map(branchUnits.map((unit) => [unit.itemCode, unit]));
  const dates = new Map<string, string>();

  for (const row of rows) {
    if (dates.has(row.itemCode)) continue;

    const unit = unitByCode.get(row.itemCode);
    if (!unit) continue;

    const matchesBranch =
      row.transfer.toBranchId === unit.branchId ||
      (unit.status === InventoryUnitStatus.InTransit &&
        row.transfer.status === StockTransferStatus.Pending);

    if (!matchesBranch) continue;

    // Accepted lines, or pending internal transfers before scan flags are set.
    if (
      row.accepted ||
      row.transfer.status === StockTransferStatus.Pending
    ) {
      dates.set(row.itemCode, row.transfer.transferDate.toISOString());
    }
  }

  return dates;
};

const resolveTransferDestinationName = (transfer: {
  toBranch: { name: string };
  fromBranchId: string;
  toBranchId: string;
  customerBranch?: {
    name: string;
    linkedBranch?: { name: string } | null;
  } | null;
}): string | undefined =>
  transfer.customerBranch?.linkedBranch?.name ??
  transfer.customerBranch?.name ??
  (transfer.toBranchId !== transfer.fromBranchId
    ? transfer.toBranch.name
    : undefined);

/** Latest outbound transfer destination label per item code (for central stock location). */
export const getLatestTransferLocationByItemCode = async (
  itemCodes: string[],
): Promise<Map<string, string>> => {
  const uniqueCodes = [...new Set(itemCodes.map((code) => code.trim()).filter(Boolean))];
  if (uniqueCodes.length === 0) return new Map();

  const rows = await prisma.stockTransferItem.findMany({
    where: { itemCode: { in: uniqueCodes } },
    include: {
      transfer: {
        include: {
          toBranch: true,
          customerBranch: { include: { linkedBranch: true } },
        },
      },
    },
    orderBy: { transfer: { createdAt: "desc" } },
  });

  const locations = new Map<string, string>();
  for (const row of rows) {
    if (locations.has(row.itemCode)) continue;
    const name = resolveTransferDestinationName(row.transfer);
    if (name) locations.set(row.itemCode, name);
  }

  return locations;
};

/** Move Transferred units to the linked store branch recorded on their stock transfer. */
export const backfillTransferredUnitBranches = async (): Promise<{
  scanned: number;
  updated: number;
}> => {
  const units = await prisma.inventoryUnit.findMany({
    where: { status: InventoryUnitStatus.Transferred },
    select: { id: true, itemCode: true, branchId: true },
  });

  let updated = 0;

  for (const unit of units) {
    const row = await prisma.stockTransferItem.findFirst({
      where: { itemCode: unit.itemCode },
      include: {
        transfer: {
          include: {
            customerBranch: { include: { linkedBranch: true } },
          },
        },
      },
      orderBy: { transfer: { createdAt: "desc" } },
    });

    const destinationBranchId = row?.transfer.customerBranch?.branchId;
    if (!destinationBranchId || unit.branchId === destinationBranchId) continue;

    await prisma.inventoryUnit.update({
      where: { id: unit.id },
      data: { branchId: destinationBranchId },
    });
    updated += 1;
  }

  return { scanned: units.length, updated };
};
