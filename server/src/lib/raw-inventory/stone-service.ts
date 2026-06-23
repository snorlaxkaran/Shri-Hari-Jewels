import { StoneLotStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { organizationBranchFilter } from "../branches/access.js";
import type {
  AdjustStoneLotInput,
  NewStoneLotInput,
  StoneLot,
  TransferStoneLotInput,
  UpdateStoneLotInput,
} from "../../types.js";
import { recordAudit } from "./audit.js";
import { generateStoneCertificateNumber } from "./lot-no.js";
import { toStoneLot } from "./mappers.js";
import { RawInventoryError } from "./metal-service.js";

const STONE_TYPES = ["Diamond", "Precious", "SemiPrecious"] as const;
const STONE_STATUSES: Array<StoneLot["status"]> = [
  "In Stock",
  "Reserved",
  "Issued",
];

type Actor = { id: string; name: string };

export const listStoneLots = async (
  organizationId: string,
  branchId?: string,
): Promise<StoneLot[]> => {
  const rows = await prisma.stoneLot.findMany({
    where: organizationBranchFilter(organizationId, branchId),
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toStoneLot);
};

export const getStoneLot = async (id: string): Promise<StoneLot> => {
  const row = await prisma.stoneLot.findUnique({ where: { id } });
  if (!row) throw new RawInventoryError("Stone lot not found.", 404);
  return toStoneLot(row);
};

export const createStoneLot = async (
  input: NewStoneLotInput,
  actor: Actor,
  branchId: string,
): Promise<StoneLot> => {
  if (!STONE_TYPES.includes(input.stoneType)) {
    throw new RawInventoryError("Invalid stone type.");
  }
  if (!input.carat || input.carat <= 0) {
    throw new RawInventoryError("Carat must be greater than zero.");
  }
  if (!input.vendor?.trim()) {
    throw new RawInventoryError("Vendor is required.");
  }

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    throw new RawInventoryError(
      "Your branch is not set up in the system. Contact an administrator.",
    );
  }

  const existingCerts = await prisma.stoneLot.findMany({
    select: { certificateNumber: true },
  });
  const certNumbers = existingCerts.map((r) => r.certificateNumber);

  let certificateNumber = input.certificateNumber?.trim();
  if (certificateNumber) {
    if (certNumbers.includes(certificateNumber)) {
      throw new RawInventoryError("Certificate number already exists.");
    }
  } else {
    certificateNumber = generateStoneCertificateNumber(
      input.stoneType,
      certNumbers,
    );
  }

  const row = await prisma.stoneLot.create({
    data: {
      branchId,
      certificateNumber,
      stoneType: input.stoneType,
      carat: input.carat,
      color: input.color?.trim() || null,
      clarity: input.clarity?.trim() || null,
      cut: input.cut?.trim() || null,
      vendor: input.vendor.trim(),
      purchaseRate: input.purchaseRate ?? null,
      currentRate: input.currentRate ?? null,
      location: input.location?.trim() || "Main Vault",
      notes: input.notes?.trim() || null,
    },
  });

  await recordAudit({
    stockType: "Stone",
    stockId: row.id,
    lotRef: row.certificateNumber,
    action: "Create",
    newValue: {
      carat: row.carat,
      stoneType: row.stoneType,
      location: row.location,
    },
    performedById: actor.id,
    performedByName: actor.name,
  });

  return toStoneLot(row);
};

export const updateStoneLot = async (
  id: string,
  input: UpdateStoneLotInput,
  actor: Actor,
): Promise<StoneLot> => {
  const existing = await prisma.stoneLot.findUnique({ where: { id } });
  if (!existing) throw new RawInventoryError("Stone lot not found.", 404);

  if (input.status && !STONE_STATUSES.includes(input.status)) {
    throw new RawInventoryError("Invalid stone status.");
  }

  const statusValue =
    input.status === "In Stock"
      ? StoneLotStatus.InStock
      : input.status === "Reserved"
        ? StoneLotStatus.Reserved
        : input.status === "Issued"
          ? StoneLotStatus.Issued
          : undefined;

  const row = await prisma.stoneLot.update({
    where: { id },
    data: {
      color: input.color === null ? null : input.color?.trim(),
      clarity: input.clarity === null ? null : input.clarity?.trim(),
      cut: input.cut === null ? null : input.cut?.trim(),
      vendor: input.vendor?.trim(),
      purchaseRate: input.purchaseRate === null ? null : input.purchaseRate,
      currentRate: input.currentRate === null ? null : input.currentRate,
      location: input.location?.trim(),
      status: statusValue,
      notes: input.notes === null ? null : input.notes?.trim(),
    },
  });

  await recordAudit({
    stockType: "Stone",
    stockId: row.id,
    lotRef: row.certificateNumber,
    action: "Update",
    previousValue: {
      color: existing.color,
      clarity: existing.clarity,
      cut: existing.cut,
      vendor: existing.vendor,
      location: existing.location,
      status: existing.status,
    },
    newValue: {
      color: row.color,
      clarity: row.clarity,
      cut: row.cut,
      vendor: row.vendor,
      location: row.location,
      status: row.status,
    },
    performedById: actor.id,
    performedByName: actor.name,
  });

  return toStoneLot(row);
};

export const transferStoneLot = async (
  id: string,
  input: TransferStoneLotInput,
  actor: Actor,
): Promise<StoneLot> => {
  const existing = await prisma.stoneLot.findUnique({ where: { id } });
  if (!existing) throw new RawInventoryError("Stone lot not found.", 404);

  const toLocation = input.toLocation.trim();
  if (!toLocation)
    throw new RawInventoryError("Destination location is required.");
  if (toLocation === existing.location) {
    throw new RawInventoryError("Stone is already at that location.");
  }

  const row = await prisma.stoneLot.update({
    where: { id },
    data: { location: toLocation },
  });

  await recordAudit({
    stockType: "Stone",
    stockId: row.id,
    lotRef: row.certificateNumber,
    action: "Transfer",
    fromLocation: existing.location,
    toLocation,
    reason: input.reason?.trim(),
    performedById: actor.id,
    performedByName: actor.name,
  });

  return toStoneLot(row);
};

export const adjustStoneLot = async (
  id: string,
  input: AdjustStoneLotInput,
  actor: Actor,
): Promise<StoneLot> => {
  const existing = await prisma.stoneLot.findUnique({ where: { id } });
  if (!existing) throw new RawInventoryError("Stone lot not found.", 404);

  if (!input.carat || input.carat <= 0) {
    throw new RawInventoryError("Adjusted carat must be greater than zero.");
  }
  if (!input.reason?.trim()) {
    throw new RawInventoryError("Reason is required for stock adjustment.");
  }

  const row = await prisma.stoneLot.update({
    where: { id },
    data: { carat: input.carat },
  });

  await recordAudit({
    stockType: "Stone",
    stockId: row.id,
    lotRef: row.certificateNumber,
    action: "Adjustment",
    previousValue: { carat: existing.carat },
    newValue: { carat: row.carat },
    delta: row.carat - existing.carat,
    reason: input.reason.trim(),
    performedById: actor.id,
    performedByName: actor.name,
  });

  return toStoneLot(row);
};
