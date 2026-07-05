import { prisma } from "../db.js";
import { DEFAULT_STONE_TYPE_NAMES } from "./defaults.js";
import type { StoneType, NewStoneTypeInput } from "../../types.js";

export class StoneTypeError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "StoneTypeError";
  }
}

const toStoneType = (row: {
  id: string;
  name: string;
  isActive: boolean;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}): StoneType => ({
  id: row.id,
  name: row.name,
  isActive: row.isActive,
  createdByName: row.createdByName,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const ensureDefaultStoneTypes = async (
  organizationId: string,
  createdByName: string,
): Promise<void> => {
  const existing = await prisma.stoneType.count({ where: { organizationId } });
  if (existing > 0) return;

  await prisma.stoneType.createMany({
    data: DEFAULT_STONE_TYPE_NAMES.map((name) => ({
      organizationId,
      name,
      createdByName,
    })),
    skipDuplicates: true,
  });
};

export const listStoneTypes = async (
  organizationId: string,
  activeOnly = true,
): Promise<StoneType[]> => {
  await ensureDefaultStoneTypes(organizationId, "System");
  const rows = await prisma.stoneType.findMany({
    where: {
      organizationId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: { name: "asc" },
  });
  return rows.map(toStoneType);
};

export const createStoneType = async (
  input: NewStoneTypeInput,
  organizationId: string,
  createdByName: string,
): Promise<StoneType> => {
  const name = input.name?.trim();
  if (!name) throw new StoneTypeError("Stone type name is required.");

  const existing = await prisma.stoneType.findFirst({
    where: {
      organizationId,
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (existing) {
    if (!existing.isActive) {
      const revived = await prisma.stoneType.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      return toStoneType(revived);
    }
    throw new StoneTypeError(`Stone type "${name}" already exists.`);
  }

  const created = await prisma.stoneType.create({
    data: {
      organizationId,
      name,
      createdByName,
    },
  });
  return toStoneType(created);
};

export const resolveStoneTypeName = async (
  organizationId: string,
  stoneTypeId?: string,
  stoneName?: string,
  createdByName = "System",
): Promise<string> => {
  if (stoneTypeId?.trim()) {
    const type = await prisma.stoneType.findFirst({
      where: { id: stoneTypeId.trim(), organizationId, isActive: true },
    });
    if (!type) throw new StoneTypeError("Stone type not found.");
    return type.name;
  }

  const name = stoneName?.trim();
  if (!name) throw new StoneTypeError("Stone type is required.");

  await ensureDefaultStoneTypes(organizationId, createdByName);

  const existing = await prisma.stoneType.findFirst({
    where: {
      organizationId,
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (existing) {
    if (!existing.isActive) {
      await prisma.stoneType.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    return existing.name;
  }

  const created = await createStoneType({ name }, organizationId, createdByName);
  return created.name;
};
