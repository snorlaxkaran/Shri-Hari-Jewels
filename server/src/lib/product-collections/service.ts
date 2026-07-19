import { prisma } from "../db.js";
import { DEFAULT_PRODUCT_COLLECTION_NAMES } from "./defaults.js";
import type { NewProductCollectionInput, ProductCollection } from "../../types.js";

export class ProductCollectionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "ProductCollectionError";
  }
}

const toProductCollection = (row: {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ProductCollection => ({
  id: row.id,
  organizationId: row.organizationId,
  name: row.name,
  isActive: row.isActive,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const ensureDefaultProductCollections = async (
  organizationId: string,
): Promise<void> => {
  const existing = await prisma.productCollection.count({ where: { organizationId } });
  if (existing > 0) return;

  await prisma.productCollection.createMany({
    data: DEFAULT_PRODUCT_COLLECTION_NAMES.map((name) => ({
      organizationId,
      name,
    })),
    skipDuplicates: true,
  });
};

export const listProductCollections = async (
  organizationId: string,
  activeOnly = true,
): Promise<ProductCollection[]> => {
  await ensureDefaultProductCollections(organizationId);
  const rows = await prisma.productCollection.findMany({
    where: {
      organizationId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: { name: "asc" },
  });
  return rows.map(toProductCollection);
};

export const createProductCollection = async (
  organizationId: string,
  input: NewProductCollectionInput,
): Promise<ProductCollection> => {
  const name = input.name?.trim();
  if (!name) throw new ProductCollectionError("Collection name is required.");

  await ensureDefaultProductCollections(organizationId);

  const existing = await prisma.productCollection.findFirst({
    where: {
      organizationId,
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (existing) {
    if (!existing.isActive) {
      const revived = await prisma.productCollection.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      return toProductCollection(revived);
    }
    throw new ProductCollectionError(`Collection "${name}" already exists.`);
  }

  const created = await prisma.productCollection.create({
    data: {
      organizationId,
      name,
    },
  });
  return toProductCollection(created);
};
