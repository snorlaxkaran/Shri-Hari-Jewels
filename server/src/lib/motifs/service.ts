import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import {
  isValidMotifPurityForMetal,
} from "../designs/validation.js";
import type {
  Motif,
  MotifMetal,
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

const toMotif = (row: {
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
  price: { toString(): string } | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Motif => ({
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
  price: row.price != null ? moneyToNumber(String(row.price)) : undefined,
  imageUrl: row.imageUrl ?? undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

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

  if (input.weightGrams != null && input.weightGrams < 0) {
    throw new MotifError("Weight must be zero or greater.");
  }
  if (input.price != null && input.price < 0) {
    throw new MotifError("Price must be zero or greater.");
  }

  return {
    ...input,
    name,
    description: input.description?.trim() || undefined,
  };
};

export const listMotifs = async (): Promise<Motif[]> => {
  const rows = await prisma.motif.findMany({
    orderBy: [{ subCategory: "asc" }, { name: "asc" }],
  });
  return rows.map(toMotif);
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
      price: validated.price,
      imageUrl: validated.imageUrl,
    },
  });
  return toMotif(row);
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
  const existing = await prisma.motif.findUnique({ where: { id } });
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

  const row = await prisma.motif.update({
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
      price: input.price,
      imageUrl: input.imageUrl,
    },
  });
  return toMotif(row);
};

export const deleteMotif = async (id: string): Promise<void> => {
  const existing = await prisma.motif.findUnique({ where: { id } });
  if (!existing) throw new MotifError("Motif not found.", 404);
  await prisma.motif.delete({ where: { id } });
};
