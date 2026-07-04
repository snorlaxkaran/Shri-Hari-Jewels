import {
  StoneCategory,
  StoneOriginType,
  StoneShape,
  StoneUOM,
} from "@prisma/client";
import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import type {
  NewStoneMasterInput,
  StoneMaster,
  UpdateStoneMasterInput,
} from "../../types.js";

export class StoneMasterError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "StoneMasterError";
  }
}

const STONE_CATEGORIES = Object.values(StoneCategory);
const STONE_ORIGIN_TYPES = Object.values(StoneOriginType);
const STONE_SHAPES = Object.values(StoneShape);
const STONE_UOMS = Object.values(StoneUOM);

const toStoneMaster = (row: {
  id: string;
  stoneCode: string;
  stoneName: string;
  stoneCategory: StoneCategory;
  stoneType: StoneOriginType;
  stoneMaterial: string;
  shape: StoneShape;
  sizeMm: string;
  color: string;
  clarityGrade: string | null;
  cut: string | null;
  uom: StoneUOM;
  unitWeightCt: { toString(): string } | null;
  isActive: boolean;
  isAutoCreated: boolean;
  notes: string | null;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}): StoneMaster => ({
  id: row.id,
  stoneCode: row.stoneCode,
  stoneName: row.stoneName,
  stoneCategory: row.stoneCategory,
  stoneType: row.stoneType,
  stoneMaterial: row.stoneMaterial,
  shape: row.shape,
  sizeMm: row.sizeMm,
  color: row.color,
  clarityGrade: row.clarityGrade ?? undefined,
  cut: row.cut ?? undefined,
  uom: row.uom,
  unitWeightCt:
    row.unitWeightCt != null
      ? moneyToNumber(String(row.unitWeightCt))
      : undefined,
  isActive: row.isActive,
  isAutoCreated: row.isAutoCreated,
  notes: row.notes ?? undefined,
  createdByName: row.createdByName,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const listStoneMasters = async (
  organizationId: string,
  filters?: {
    category?: StoneCategory;
    activeOnly?: boolean;
    search?: string;
  },
): Promise<StoneMaster[]> => {
  const search = filters?.search?.trim();
  const rows = await prisma.stoneMaster.findMany({
    where: {
      organizationId,
      ...(filters?.category ? { stoneCategory: filters.category } : {}),
      ...(filters?.activeOnly ? { isActive: true } : {}),
      ...(search
        ? {
            OR: [
              { stoneCode: { contains: search, mode: "insensitive" } },
              { stoneName: { contains: search, mode: "insensitive" } },
              { stoneMaterial: { contains: search, mode: "insensitive" } },
              { sizeMm: { contains: search, mode: "insensitive" } },
              { color: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ stoneCategory: "asc" }, { stoneName: "asc" }],
  });
  return rows.map(toStoneMaster);
};

export const getStoneMaster = async (
  id: string,
  organizationId: string,
): Promise<StoneMaster> => {
  const row = await prisma.stoneMaster.findFirst({
    where: { id, organizationId },
  });
  if (!row) throw new StoneMasterError("Stone master entry not found.", 404);
  return toStoneMaster(row);
};

const validateInput = (input: NewStoneMasterInput) => {
  const stoneCode = input.stoneCode?.trim();
  const stoneName = input.stoneName?.trim();
  if (!stoneCode) throw new StoneMasterError("Stone code is required.");
  if (!stoneName) throw new StoneMasterError("Stone name is required.");
  if (!STONE_CATEGORIES.includes(input.stoneCategory)) {
    throw new StoneMasterError("Invalid stone category.");
  }
  if (!STONE_ORIGIN_TYPES.includes(input.stoneType)) {
    throw new StoneMasterError("Invalid stone type.");
  }
  if (!input.stoneMaterial?.trim()) {
    throw new StoneMasterError("Stone material is required.");
  }
  if (!STONE_SHAPES.includes(input.shape)) {
    throw new StoneMasterError("Invalid stone shape.");
  }
  if (!input.sizeMm?.trim()) throw new StoneMasterError("Size is required.");
  if (!input.color?.trim()) throw new StoneMasterError("Color is required.");
  if (!STONE_UOMS.includes(input.uom)) {
    throw new StoneMasterError("Invalid unit of measure.");
  }
  return {
    stoneCode,
    stoneName,
    stoneMaterial: input.stoneMaterial.trim(),
    sizeMm: input.sizeMm.trim(),
    color: input.color.trim(),
    clarityGrade: input.clarityGrade?.trim() || null,
    cut: input.cut?.trim() || null,
    notes: input.notes?.trim() || null,
    unitWeightCt: input.unitWeightCt ?? null,
    isActive: input.isActive ?? true,
  };
};

export const createStoneMaster = async (
  input: NewStoneMasterInput,
  organizationId: string,
  createdByName: string,
): Promise<StoneMaster> => {
  const validated = validateInput(input);

  const existing = await prisma.stoneMaster.findUnique({
    where: {
      organizationId_stoneCode: {
        organizationId,
        stoneCode: validated.stoneCode,
      },
    },
  });
  if (existing) {
    throw new StoneMasterError(
      `Stone code "${validated.stoneCode}" already exists in your catalog.`,
    );
  }

  const row = await prisma.stoneMaster.create({
    data: {
      organizationId,
      stoneCode: validated.stoneCode,
      stoneName: validated.stoneName,
      stoneCategory: input.stoneCategory,
      stoneType: input.stoneType,
      stoneMaterial: validated.stoneMaterial,
      shape: input.shape,
      sizeMm: validated.sizeMm,
      color: validated.color,
      clarityGrade: validated.clarityGrade,
      cut: validated.cut,
      uom: input.uom,
      unitWeightCt: validated.unitWeightCt,
      isActive: validated.isActive,
      notes: validated.notes,
      createdByName,
    },
  });
  return toStoneMaster(row);
};

export const updateStoneMaster = async (
  id: string,
  input: UpdateStoneMasterInput,
  organizationId: string,
): Promise<StoneMaster> => {
  const existing = await prisma.stoneMaster.findFirst({
    where: { id, organizationId },
  });
  if (!existing) throw new StoneMasterError("Stone master entry not found.", 404);

  if (input.stoneCategory && !STONE_CATEGORIES.includes(input.stoneCategory)) {
    throw new StoneMasterError("Invalid stone category.");
  }
  if (input.stoneType && !STONE_ORIGIN_TYPES.includes(input.stoneType)) {
    throw new StoneMasterError("Invalid stone type.");
  }
  if (input.shape && !STONE_SHAPES.includes(input.shape)) {
    throw new StoneMasterError("Invalid stone shape.");
  }
  if (input.uom && !STONE_UOMS.includes(input.uom)) {
    throw new StoneMasterError("Invalid unit of measure.");
  }

  if (input.stoneCode?.trim() && input.stoneCode.trim() !== existing.stoneCode) {
    const dup = await prisma.stoneMaster.findUnique({
      where: {
        organizationId_stoneCode: {
          organizationId,
          stoneCode: input.stoneCode.trim(),
        },
      },
    });
    if (dup) {
      throw new StoneMasterError(
        `Stone code "${input.stoneCode.trim()}" already exists.`,
      );
    }
  }

  const row = await prisma.stoneMaster.update({
    where: { id },
    data: {
      stoneCode: input.stoneCode?.trim(),
      stoneName: input.stoneName?.trim(),
      stoneCategory: input.stoneCategory,
      stoneType: input.stoneType,
      stoneMaterial: input.stoneMaterial?.trim(),
      shape: input.shape,
      sizeMm: input.sizeMm?.trim(),
      color: input.color?.trim(),
      clarityGrade:
        input.clarityGrade === null ? null : input.clarityGrade?.trim(),
      cut: input.cut === null ? null : input.cut?.trim(),
      uom: input.uom,
      unitWeightCt:
        input.unitWeightCt === null ? null : input.unitWeightCt,
      isActive: input.isActive,
      notes: input.notes === null ? null : input.notes?.trim(),
    },
  });
  return toStoneMaster(row);
};
