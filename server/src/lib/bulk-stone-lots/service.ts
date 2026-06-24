import { prisma } from "../db.js";
import { organizationBranchFilter } from "../branches/access.js";
import { moneyToNumber } from "../money.js";
import { MOTIF_STONE_TYPES } from "../motifs/service.js";
import type {
  BulkStoneLot,
  MotifStoneType,
  NewBulkStoneLotInput,
  UpdateBulkStoneLotInput,
} from "../../types.js";

export class BulkStoneLotError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "BulkStoneLotError";
  }
}

const toBulkStoneLot = (row: {
  id: string;
  sizeLabel: string;
  stoneType: string;
  quantity: number;
  pricePerStone: { toString(): string };
  vendor: string | null;
  lotReference: string | null;
  purchaseDate: Date | null;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}): BulkStoneLot => ({
  id: row.id,
  sizeLabel: row.sizeLabel,
  stoneType: row.stoneType as MotifStoneType,
  quantity: row.quantity,
  pricePerStone: moneyToNumber(String(row.pricePerStone)),
  vendor: row.vendor ?? undefined,
  lotReference: row.lotReference ?? undefined,
  purchaseDate: row.purchaseDate?.toISOString(),
  location: row.location,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const validateInput = (input: NewBulkStoneLotInput) => {
  const sizeLabel = input.sizeLabel?.trim();
  if (!sizeLabel) throw new BulkStoneLotError("Size label is required.");

  if (!MOTIF_STONE_TYPES.includes(input.stoneType)) {
    throw new BulkStoneLotError("Invalid stone type.");
  }
  if (input.quantity == null || input.quantity < 0) {
    throw new BulkStoneLotError("Quantity must be zero or greater.");
  }
  if (input.pricePerStone == null || input.pricePerStone < 0) {
    throw new BulkStoneLotError("Price per stone must be zero or greater.");
  }

  return {
    ...input,
    sizeLabel,
    vendor: input.vendor?.trim() || undefined,
    lotReference: input.lotReference?.trim() || undefined,
    location: input.location?.trim() || "Main Vault",
    purchaseDate: input.purchaseDate
      ? new Date(input.purchaseDate)
      : undefined,
  };
};

export const listBulkStoneLots = async (
  organizationId: string,
  branchId?: string,
): Promise<BulkStoneLot[]> => {
  const rows = await prisma.bulkStoneLot.findMany({
    where: organizationBranchFilter(organizationId, branchId),
    orderBy: [{ stoneType: "asc" }, { sizeLabel: "asc" }],
  });
  return rows.map(toBulkStoneLot);
};

export const getBulkStoneLot = async (id: string): Promise<BulkStoneLot> => {
  const row = await prisma.bulkStoneLot.findUnique({ where: { id } });
  if (!row) throw new BulkStoneLotError("Bulk stone lot not found.", 404);
  return toBulkStoneLot(row);
};

export const createBulkStoneLot = async (
  input: NewBulkStoneLotInput,
  branchId: string,
): Promise<BulkStoneLot> => {
  const validated = validateInput(input);

  const row = await prisma.bulkStoneLot.create({
    data: {
      branchId,
      sizeLabel: validated.sizeLabel,
      stoneType: validated.stoneType,
      quantity: validated.quantity,
      pricePerStone: validated.pricePerStone,
      vendor: validated.vendor ?? null,
      lotReference: validated.lotReference ?? null,
      purchaseDate: validated.purchaseDate ?? null,
      location: validated.location,
    },
  });
  return toBulkStoneLot(row);
};

export const updateBulkStoneLot = async (
  id: string,
  input: UpdateBulkStoneLotInput,
  actor?: { id: string; name: string },
): Promise<BulkStoneLot> => {
  const existing = await prisma.bulkStoneLot.findUnique({ where: { id } });
  if (!existing) throw new BulkStoneLotError("Bulk stone lot not found.", 404);

  if (input.stoneType && !MOTIF_STONE_TYPES.includes(input.stoneType)) {
    throw new BulkStoneLotError("Invalid stone type.");
  }
  if (input.quantity != null && input.quantity < 0) {
    throw new BulkStoneLotError("Quantity must be zero or greater.");
  }
  if (input.pricePerStone != null && input.pricePerStone < 0) {
    throw new BulkStoneLotError("Price per stone must be zero or greater.");
  }

  const row = await prisma.bulkStoneLot.update({
    where: { id },
    data: {
      sizeLabel: input.sizeLabel?.trim(),
      stoneType: input.stoneType,
      quantity: input.quantity,
      pricePerStone: input.pricePerStone,
      vendor: input.vendor === undefined ? undefined : input.vendor?.trim() || null,
      lotReference:
        input.lotReference === undefined
          ? undefined
          : input.lotReference?.trim() || null,
      purchaseDate:
        input.purchaseDate === undefined
          ? undefined
          : input.purchaseDate
            ? new Date(input.purchaseDate)
            : null,
      location: input.location?.trim(),
    },
  });

  const priceChanged =
    input.pricePerStone != null &&
    moneyToNumber(String(existing.pricePerStone)) !== input.pricePerStone;

  if (priceChanged && actor) {
    // Bulk stone lots are deprecated; motif pricing uses stone master rates
  }

  return toBulkStoneLot(row);
};

export const deleteBulkStoneLot = async (id: string): Promise<void> => {
  const existing = await prisma.bulkStoneLot.findUnique({
    where: { id },
  });
  if (!existing) throw new BulkStoneLotError("Bulk stone lot not found.", 404);
  await prisma.bulkStoneLot.delete({ where: { id } });
};

export const deductBulkStoneQuantity = async (
  bulkStoneLotId: string,
  count: number,
): Promise<void> => {
  if (count <= 0) return;

  const lot = await prisma.bulkStoneLot.findUnique({
    where: { id: bulkStoneLotId },
  });
  if (!lot) throw new BulkStoneLotError("Bulk stone lot not found.", 404);
  if (lot.quantity < count) {
    throw new BulkStoneLotError(
      `Insufficient stones in lot "${lot.sizeLabel}": need ${count}, have ${lot.quantity}.`,
    );
  }

  await prisma.bulkStoneLot.update({
    where: { id: bulkStoneLotId },
    data: { quantity: lot.quantity - count },
  });
};
