import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import {
  isValidMotifPurityForMetal,
} from "../designs/validation.js";
import type {
  Motif,
  MotifMetal,
  MotifStone,
  MotifStoneInput,
  MotifStoneType,
  MotifSubCategory,
  NewMotifInput,
  Purity,
  UpdateMotifInput,
} from "../../types.js";

export const MOTIF_METALS: MotifMetal[] = ["Silver", "Gold", "Platinum"];

export const MOTIF_STONE_TYPES: MotifStoneType[] = [
  "Glass",
  "Enamel",
  "Pearl",
  "Zircon",
  "Turquoise",
  "Black Onyx",
  "Emerald",
];

export const MOTIF_SUB_CATEGORIES: MotifSubCategory[] = [
  "Contemporary",
  "Traditional",
  "Tribal",
  "Bridal",
];

export class MotifError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "MotifError";
  }
}

const motifInclude = {
  stones: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      bulkStoneLot: {
        select: {
          id: true,
          sizeLabel: true,
          stoneType: true,
          pricePerStone: true,
        },
      },
    },
  },
};

type MotifRow = {
  id: string;
  name: string;
  description: string | null;
  weightGrams: number | null;
  metal: string;
  purity: string;
  stone1: string | null;
  stone2: string | null;
  stone3: string | null;
  subCategory: string;
  makingCost: { toString(): string } | null;
  price: { toString(): string } | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  stones?: Array<{
    id: string;
    bulkStoneLotId: string;
    qtyPerMotif: number;
    sortOrder: number;
    bulkStoneLot: {
      id: string;
      sizeLabel: string;
      stoneType: string;
      pricePerStone: { toString(): string };
    };
  }>;
};

const toMotifStone = (
  row: NonNullable<MotifRow["stones"]>[number],
): MotifStone => ({
  id: row.id,
  bulkStoneLotId: row.bulkStoneLotId,
  qtyPerMotif: row.qtyPerMotif,
  sortOrder: row.sortOrder,
  bulkStoneLot: {
    id: row.bulkStoneLot.id,
    sizeLabel: row.bulkStoneLot.sizeLabel,
    stoneType: row.bulkStoneLot.stoneType as MotifStoneType,
    pricePerStone: moneyToNumber(String(row.bulkStoneLot.pricePerStone)),
  },
});

const toMotif = (row: MotifRow): Motif => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  weightGrams: row.weightGrams ?? undefined,
  metal: row.metal as MotifMetal,
  purity: row.purity as Purity,
  stone1: (row.stone1 as MotifStoneType) ?? undefined,
  stone2: (row.stone2 as MotifStoneType) ?? undefined,
  stone3: (row.stone3 as MotifStoneType) ?? undefined,
  subCategory: row.subCategory as MotifSubCategory,
  makingCost:
    row.makingCost != null ? moneyToNumber(String(row.makingCost)) : undefined,
  price: row.price != null ? moneyToNumber(String(row.price)) : undefined,
  stones: (row.stones ?? []).map(toMotifStone),
  imageUrl: row.imageUrl ?? undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const calculateMotifPrice = async (
  stones: MotifStoneInput[],
  makingCost?: number | null,
  priceOverride?: number | null,
): Promise<number> => {
  if (priceOverride != null && stones.length === 0) {
    return priceOverride;
  }

  let stoneTotal = 0;
  for (const stone of stones) {
    const lot = await prisma.bulkStoneLot.findUnique({
      where: { id: stone.bulkStoneLotId },
    });
    if (!lot) {
      throw new MotifError(`Bulk stone lot not found: ${stone.bulkStoneLotId}`);
    }
    if (stone.qtyPerMotif < 1) {
      throw new MotifError("Stone quantity per motif must be at least 1.");
    }
    stoneTotal +=
      moneyToNumber(String(lot.pricePerStone)) * stone.qtyPerMotif;
  }

  const computed = stoneTotal + (makingCost ?? 0);
  if (priceOverride != null) return priceOverride;
  return computed;
};

const validateMotifStones = (stones?: MotifStoneInput[]) => {
  if (!stones?.length) return;
  for (const stone of stones) {
    if (!stone.bulkStoneLotId) {
      throw new MotifError("Each motif stone must reference a bulk stone lot.");
    }
    if (stone.qtyPerMotif < 1) {
      throw new MotifError("Stone quantity per motif must be at least 1.");
    }
  }
};

const validateMotifPurity = (metal: MotifMetal, purity: Purity) => {
  if (!isValidMotifPurityForMetal(metal, purity)) {
    throw new MotifError(
      `Invalid purity "${purity}" for ${metal}. Silver requires 925; Gold and Platinum use 24K–14K.`,
    );
  }
};

const validateMotifInput = (input: NewMotifInput) => {
  const name = input.name?.trim();
  if (!name) throw new MotifError("Motif name is required.");

  if (!MOTIF_METALS.includes(input.metal)) {
    throw new MotifError("Invalid motif metal.");
  }
  if (!input.purity) {
    throw new MotifError("Purity is required.");
  }
  validateMotifPurity(input.metal, input.purity);
  if (!MOTIF_SUB_CATEGORIES.includes(input.subCategory)) {
    throw new MotifError("Invalid sub category.");
  }

  for (const stone of [input.stone1, input.stone2, input.stone3]) {
    if (stone && !MOTIF_STONE_TYPES.includes(stone)) {
      throw new MotifError(`Invalid stone type: ${stone}`);
    }
  }

  validateMotifStones(input.stones);

  if (input.weightGrams != null && input.weightGrams < 0) {
    throw new MotifError("Weight must be zero or greater.");
  }
  if (input.price != null && input.price < 0) {
    throw new MotifError("Price must be zero or greater.");
  }
  if (input.makingCost != null && input.makingCost < 0) {
    throw new MotifError("Making cost must be zero or greater.");
  }

  return {
    ...input,
    name,
    description: input.description?.trim() || undefined,
    stones: input.stones ?? [],
  };
};

const syncMotifStones = async (
  motifId: string,
  stones: MotifStoneInput[],
) => {
  await prisma.motifStone.deleteMany({ where: { motifId } });
  if (stones.length === 0) return;

  await prisma.motifStone.createMany({
    data: stones.map((stone, index) => ({
      motifId,
      bulkStoneLotId: stone.bulkStoneLotId,
      qtyPerMotif: stone.qtyPerMotif,
      sortOrder: stone.sortOrder ?? index,
    })),
  });
};

export const listMotifs = async (): Promise<Motif[]> => {
  const rows = await prisma.motif.findMany({
    include: motifInclude,
    orderBy: [{ subCategory: "asc" }, { name: "asc" }],
  });
  return rows.map(toMotif);
};

export const getMotif = async (id: string): Promise<Motif> => {
  const row = await prisma.motif.findUnique({
    where: { id },
    include: motifInclude,
  });
  if (!row) throw new MotifError("Motif not found.", 404);
  return toMotif(row);
};

export const createMotif = async (
  input: NewMotifInput,
  branchId: string,
): Promise<Motif> => {
  const validated = validateMotifInput(input);

  const duplicate = await prisma.motif.findFirst({
    where: {
      branchId,
      name: validated.name,
      metal: validated.metal,
      purity: validated.purity,
    },
  });
  if (duplicate) {
    throw new MotifError(
      `A motif named "${validated.name}" already exists for ${validated.metal} ${validated.purity}.`,
    );
  }

  const price = await calculateMotifPrice(
    validated.stones,
    validated.makingCost,
    validated.price,
  );

  const row = await prisma.motif.create({
    data: {
      branchId,
      name: validated.name,
      description: validated.description,
      weightGrams: validated.weightGrams,
      metal: validated.metal,
      purity: validated.purity,
      stone1: validated.stone1 ?? null,
      stone2: validated.stone2 ?? null,
      stone3: validated.stone3 ?? null,
      subCategory: validated.subCategory,
      makingCost: validated.makingCost,
      price,
      imageUrl: validated.imageUrl,
    },
  });

  await syncMotifStones(row.id, validated.stones);

  const full = await prisma.motif.findUnique({
    where: { id: row.id },
    include: motifInclude,
  });
  return toMotif(full!);
};

export const createMotifsBulk = async (
  items: NewMotifInput[],
  branchId: string,
): Promise<{ created: Motif[]; errors: string[] }> => {
  const created: Motif[] = [];
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const motif = await createMotif(items[i], branchId);
      created.push(motif);
    } catch (error) {
      const msg =
        error instanceof MotifError
          ? error.message
          : "Failed to create motif.";
      errors.push(`Row ${i + 2}: ${msg}`);
    }
  }

  return { created, errors };
};

export const updateMotif = async (
  id: string,
  input: UpdateMotifInput,
): Promise<Motif> => {
  const existing = await prisma.motif.findUnique({
    where: { id },
    include: { stones: true },
  });
  if (!existing) throw new MotifError("Motif not found.", 404);

  const metal = (input.metal ?? existing.metal) as MotifMetal;
  const purity = (input.purity ?? existing.purity) as Purity;

  if (input.metal && !MOTIF_METALS.includes(input.metal)) {
    throw new MotifError("Invalid motif metal.");
  }
  if (input.purity || input.metal) {
    validateMotifPurity(metal, purity);
  }
  if (input.subCategory && !MOTIF_SUB_CATEGORIES.includes(input.subCategory)) {
    throw new MotifError("Invalid sub category.");
  }
  for (const stone of [input.stone1, input.stone2, input.stone3]) {
    if (stone && !MOTIF_STONE_TYPES.includes(stone)) {
      throw new MotifError(`Invalid stone type: ${stone}`);
    }
  }

  if (input.stones) validateMotifStones(input.stones);

  const name = input.name?.trim() ?? existing.name;
  if (input.name !== undefined || input.metal !== undefined || input.purity !== undefined) {
    const duplicate = await prisma.motif.findFirst({
      where: {
        branchId: existing.branchId,
        name,
        metal,
        purity,
        NOT: { id },
      },
    });
    if (duplicate) {
      throw new MotifError(
        `A motif named "${name}" already exists for ${metal} ${purity}.`,
      );
    }
  }

  const stones =
    input.stones ??
    existing.stones.map((s) => ({
      bulkStoneLotId: s.bulkStoneLotId,
      qtyPerMotif: s.qtyPerMotif,
      sortOrder: s.sortOrder,
    }));

  const makingCost =
    input.makingCost === undefined
      ? existing.makingCost != null
        ? moneyToNumber(String(existing.makingCost))
        : undefined
      : input.makingCost ?? undefined;

  const recalculate =
    input.stones !== undefined ||
    input.makingCost !== undefined ||
    input.price === undefined;

  const price = recalculate
    ? await calculateMotifPrice(
        stones,
        makingCost,
        input.price === undefined ? undefined : input.price,
      )
    : input.price ?? undefined;

  await prisma.motif.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      description: input.description,
      weightGrams: input.weightGrams,
      metal: input.metal,
      purity: input.purity,
      stone1: input.stone1,
      stone2: input.stone2,
      stone3: input.stone3,
      subCategory: input.subCategory,
      makingCost: input.makingCost,
      price,
      imageUrl: input.imageUrl,
    },
  });

  if (input.stones) {
    await syncMotifStones(id, input.stones);
  }

  const full = await prisma.motif.findUnique({
    where: { id },
    include: motifInclude,
  });
  return toMotif(full!);
};

export const deleteMotif = async (id: string): Promise<void> => {
  const existing = await prisma.motif.findUnique({
    where: { id },
    include: { designElements: { take: 1 } },
  });
  if (!existing) throw new MotifError("Motif not found.", 404);
  if (existing.designElements.length > 0) {
    throw new MotifError(
      "Cannot delete a motif referenced by design elements.",
    );
  }
  await prisma.motif.delete({ where: { id } });
};

export const recalculateMotifPriceById = async (
  motifId: string,
): Promise<number> => {
  const motif = await prisma.motif.findUnique({
    where: { id: motifId },
    include: { stones: true },
  });
  if (!motif) throw new MotifError("Motif not found.", 404);

  const stones = motif.stones.map((s) => ({
    bulkStoneLotId: s.bulkStoneLotId,
    qtyPerMotif: s.qtyPerMotif,
    sortOrder: s.sortOrder,
  }));

  const makingCost =
    motif.makingCost != null
      ? moneyToNumber(String(motif.makingCost))
      : undefined;

  const price = await calculateMotifPrice(stones, makingCost);
  await prisma.motif.update({
    where: { id: motifId },
    data: { price },
  });
  return price;
};
