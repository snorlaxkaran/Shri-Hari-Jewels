import { StoneLotStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { organizationBranchFilter } from "../branches/access.js";
import { moneyToNumber, multiplyMoney } from "../money.js";
import type {
  AdjustMetalLotInput,
  MetalLot,
  NewMetalLotInput,
  RawInventorySummary,
  TransferMetalLotInput,
  UpdateMetalLotInput,
} from "../../types.js";
import { recordAudit } from "./audit.js";
import { generateMetalLotNumber } from "./lot-no.js";
import { toMetalLot } from "./mappers.js";

export class RawInventoryError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const METAL_TYPES = ["Gold", "Silver", "Platinum"] as const;
const PURITIES = ["24K", "22K", "18K", "14K", "925"] as const;

type Actor = { id: string; name: string };

export const listMetalLots = async (
  organizationId: string,
  branchId?: string,
): Promise<MetalLot[]> => {
  const rows = await prisma.metalLot.findMany({
    where: organizationBranchFilter(organizationId, branchId),
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toMetalLot);
};

export const getMetalLot = async (id: string): Promise<MetalLot> => {
  const row = await prisma.metalLot.findUnique({ where: { id } });
  if (!row) throw new RawInventoryError("Metal lot not found.", 404);
  return toMetalLot(row);
};

export const createMetalLot = async (
  input: NewMetalLotInput,
  actor: Actor,
  branchId: string,
): Promise<MetalLot> => {
  if (!METAL_TYPES.includes(input.metalType)) {
    throw new RawInventoryError("Invalid metal type.");
  }
  if (!PURITIES.includes(input.purity)) {
    throw new RawInventoryError("Invalid purity.");
  }
  if (!input.weightGrams || input.weightGrams <= 0) {
    throw new RawInventoryError("Weight must be greater than zero.");
  }
  if (!input.vendor?.trim()) {
    throw new RawInventoryError("Vendor is required.");
  }

  const existing = await prisma.metalLot.findMany({
    select: { lotNumber: true },
  });
  const lotNumber = generateMetalLotNumber(
    input.metalType,
    existing.map((r) => r.lotNumber),
  );

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    throw new RawInventoryError(
      "Your branch is not set up in the system. Contact an administrator.",
    );
  }

  const row = await prisma.metalLot.create({
    data: {
      branchId,
      lotNumber,
      metalType: input.metalType,
      purity: input.purity,
      weightGrams: input.weightGrams,
      purchaseRate: input.purchaseRate,
      currentRate: input.currentRate,
      vendor: input.vendor.trim(),
      location: input.location?.trim() || "Main Vault",
      notes: input.notes?.trim() || null,
    },
  });

  await recordAudit({
    stockType: "Metal",
    stockId: row.id,
    lotRef: row.lotNumber,
    action: "Create",
    newValue: {
      weightGrams: row.weightGrams,
      location: row.location,
      metalType: row.metalType,
      purity: row.purity,
    },
    performedById: actor.id,
    performedByName: actor.name,
  });

  return toMetalLot(row);
};

export const updateMetalLot = async (
  id: string,
  input: UpdateMetalLotInput,
  actor: Actor,
): Promise<MetalLot> => {
  const existing = await prisma.metalLot.findUnique({ where: { id } });
  if (!existing) throw new RawInventoryError("Metal lot not found.", 404);

  if (input.purity && !PURITIES.includes(input.purity)) {
    throw new RawInventoryError("Invalid purity.");
  }

  const row = await prisma.metalLot.update({
    where: { id },
    data: {
      purity: input.purity,
      purchaseRate: input.purchaseRate,
      currentRate: input.currentRate,
      vendor: input.vendor?.trim(),
      location: input.location?.trim(),
      notes: input.notes === null ? null : input.notes?.trim(),
    },
  });

  await recordAudit({
    stockType: "Metal",
    stockId: row.id,
    lotRef: row.lotNumber,
    action: "Update",
    previousValue: {
      purity: existing.purity,
      purchaseRate: existing.purchaseRate,
      currentRate: existing.currentRate,
      vendor: existing.vendor,
      location: existing.location,
    },
    newValue: {
      purity: row.purity,
      purchaseRate: row.purchaseRate,
      currentRate: row.currentRate,
      vendor: row.vendor,
      location: row.location,
    },
    performedById: actor.id,
    performedByName: actor.name,
  });

  return toMetalLot(row);
};

export const transferMetalLot = async (
  id: string,
  input: TransferMetalLotInput,
  actor: Actor,
): Promise<MetalLot> => {
  const existing = await prisma.metalLot.findUnique({ where: { id } });
  if (!existing) throw new RawInventoryError("Metal lot not found.", 404);

  const toLocation = input.toLocation.trim();
  if (!toLocation)
    throw new RawInventoryError("Destination location is required.");
  if (toLocation === existing.location) {
    throw new RawInventoryError("Lot is already at that location.");
  }

  const row = await prisma.metalLot.update({
    where: { id },
    data: { location: toLocation },
  });

  await recordAudit({
    stockType: "Metal",
    stockId: row.id,
    lotRef: row.lotNumber,
    action: "Transfer",
    fromLocation: existing.location,
    toLocation,
    reason: input.reason?.trim(),
    performedById: actor.id,
    performedByName: actor.name,
  });

  return toMetalLot(row);
};

export const adjustMetalLot = async (
  id: string,
  input: AdjustMetalLotInput,
  actor: Actor,
): Promise<MetalLot> => {
  const existing = await prisma.metalLot.findUnique({ where: { id } });
  if (!existing) throw new RawInventoryError("Metal lot not found.", 404);

  if (!input.weightGrams || input.weightGrams <= 0) {
    throw new RawInventoryError("Adjusted weight must be greater than zero.");
  }
  if (!input.reason?.trim()) {
    throw new RawInventoryError("Reason is required for stock adjustment.");
  }

  const row = await prisma.metalLot.update({
    where: { id },
    data: { weightGrams: input.weightGrams },
  });

  await recordAudit({
    stockType: "Metal",
    stockId: row.id,
    lotRef: row.lotNumber,
    action: "Adjustment",
    previousValue: { weightGrams: existing.weightGrams },
    newValue: { weightGrams: row.weightGrams },
    delta: row.weightGrams - existing.weightGrams,
    reason: input.reason.trim(),
    performedById: actor.id,
    performedByName: actor.name,
  });

  return toMetalLot(row);
};

export const getRawInventorySummary = async (
  organizationId: string,
  branchId?: string,
): Promise<RawInventorySummary> => {
  const branchFilter = organizationBranchFilter(organizationId, branchId);
  const [metalLots, stoneLots] = await Promise.all([
    prisma.metalLot.findMany({ where: branchFilter }),
    prisma.stoneLot.findMany({
      where: { ...branchFilter, status: StoneLotStatus.InStock },
    }),
  ]);

    const summary: RawInventorySummary = {
      goldGrams: 0,
      gold22kGrams: 0,
      silverGrams: 0,
      platinumGrams: 0,
      diamondCarats: 0,
      preciousCarats: 0,
      semiPreciousCarats: 0,
      metalValue: 0,
      stoneValue: 0,
    };

    for (const lot of metalLots) {
      summary.metalValue += moneyToNumber(
        multiplyMoney(lot.weightGrams, lot.currentRate),
      );
      if (lot.metalType === "Gold") {
        summary.goldGrams += lot.weightGrams;
        if (lot.purity === "22K") summary.gold22kGrams += lot.weightGrams;
      }
      if (lot.metalType === "Silver") summary.silverGrams += lot.weightGrams;
      if (lot.metalType === "Platinum")
        summary.platinumGrams += lot.weightGrams;
    }

    for (const stone of stoneLots) {
      const rate = stone.currentRate != null ? moneyToNumber(stone.currentRate) : 0;
      summary.stoneValue += moneyToNumber(multiplyMoney(stone.carat, rate));
      if (stone.stoneType === "Diamond") summary.diamondCarats += stone.carat;
      if (stone.stoneType === "Precious") summary.preciousCarats += stone.carat;
      if (stone.stoneType === "SemiPrecious") {
        summary.semiPreciousCarats += stone.carat;
      }
    }

    return summary;
  };
