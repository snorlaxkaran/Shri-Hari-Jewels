import { prisma } from "../db.js";
import type {
  InventoryItem,
  NewProductInput,
  UpdateProductInput,
} from "../../types.js";
import { CATEGORY_COLORS, type ProductCategory } from "./categories.js";
import { toInventoryItem } from "./mappers.js";
import { generateSku, generateUnitCodes } from "./sku.js";
import { getStockStatus } from "./status.js";

const productInclude = {
  units: { orderBy: { createdAt: "asc" as const } },
  images: { orderBy: { sortOrder: "asc" as const } },
};

export const listProducts = async (): Promise<InventoryItem[]> => {
  const products = await prisma.product.findMany({
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });
  return products.map(toInventoryItem);
};

export const createProduct = async (
  input: NewProductInput,
  branchId: string,
): Promise<InventoryItem> => {
  const category = input.category as ProductCategory;

  const existing = await prisma.product.findMany({
    where: { branchId },
    select: {
      sku: true,
      units: { select: { itemCode: true } },
    },
  });

  const existingSkus = existing.map((p) => p.sku);
  const existingUnitCodes = existing.flatMap((p) =>
    p.units.map((u) => u.itemCode),
  );

  const sku = generateSku(existingSkus, category);
  const unitCodes = generateUnitCodes(sku, input.quantity, existingUnitCodes);

  const product = await prisma.product.create({
    data: {
      branchId,
      sku,
      name: input.name.trim(),
      category: input.category,
      metal: input.metal,
      purity: input.purity,
      weightGrams: input.weightGrams,
      makingCharges: input.makingCharges,
      stoneCarat: input.stoneCarat,
      price: input.price,
      stock: input.quantity,
      status: getStockStatus(input.quantity),
      imageColor: CATEGORY_COLORS[category] ?? "#a1a1aa",
      units: {
        create: unitCodes.map((itemCode) => ({
          branchId,
          itemCode,
          status: "Available",
        })),
      },
      images: {
        create: input.images.map((img, index) => ({
          url: img.url,
          name: img.name,
          sortOrder: index,
        })),
      },
    },
    include: productInclude,
  });

  return toInventoryItem(product);
};

export const addQuantityToProduct = async (
  productId: string,
  quantity: number,
): Promise<InventoryItem | null> => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: productInclude,
  });

  if (!product) return null;

  const allUnits = await prisma.inventoryUnit.findMany({
    select: { itemCode: true },
  });
  const existingUnitCodes = allUnits.map((u) => u.itemCode);
  const newCodes = generateUnitCodes(product.sku, quantity, existingUnitCodes);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.inventoryUnit.createMany({
      data: newCodes.map((itemCode) => ({
        branchId: product.branchId,
        itemCode,
        productId: product.id,
        status: "Available",
      })),
    });

    const stock = product.stock + quantity;
    return tx.product.update({
      where: { id: productId },
      data: {
        stock,
        status: getStockStatus(stock),
      },
      include: productInclude,
    });
  });

  return toInventoryItem(updated);
};

export class InventoryError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

export const updateProduct = async (
  productId: string,
  input: UpdateProductInput,
): Promise<InventoryItem | null> => {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    include: productInclude,
  });
  if (!existing) return null;

  const category = (input.category ?? existing.category) as ProductCategory;

  const updated = await prisma.$transaction(async (tx) => {
    if (input.images) {
      await tx.productImage.deleteMany({ where: { productId } });
      if (input.images.length > 0) {
        await tx.productImage.createMany({
          data: input.images.map((img, index) => ({
            productId,
            url: img.url,
            name: img.name,
            sortOrder: index,
          })),
        });
      }
    }

    return tx.product.update({
      where: { id: productId },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.metal !== undefined && { metal: input.metal }),
        ...(input.purity !== undefined && { purity: input.purity }),
        ...(input.weightGrams !== undefined && {
          weightGrams: input.weightGrams,
        }),
        ...(input.makingCharges !== undefined && {
          makingCharges: input.makingCharges,
        }),
        ...(input.stoneCarat !== undefined && {
          stoneCarat: input.stoneCarat,
        }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.category !== undefined && {
          imageColor: CATEGORY_COLORS[category] ?? existing.imageColor,
        }),
      },
      include: productInclude,
    });
  });

  return toInventoryItem(updated);
};

export const deleteProduct = async (productId: string): Promise<boolean> => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { units: true },
  });
  if (!product) return false;

  const blocked = product.units.some(
    (u) => u.status === "Sold" || u.status === "Reserved",
  );
  if (blocked) {
    throw new InventoryError(
      "Cannot delete a product with sold or reserved units.",
      400,
    );
  }

  await prisma.product.delete({ where: { id: productId } });
  return true;
};

export const deleteInventoryUnit = async (
  unitId: string,
): Promise<InventoryItem | null> => {
  const unit = await prisma.inventoryUnit.findUnique({
    where: { id: unitId },
    include: { product: true, sale: true },
  });

  if (!unit) return null;

  if (unit.status !== "Available") {
    throw new InventoryError(
      `Cannot remove unit ${unit.itemCode} — it is ${unit.status}.`,
      400,
    );
  }

  if (unit.sale) {
    throw new InventoryError(
      "This unit has a sale record and cannot be removed.",
      400,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.inventoryUnit.delete({ where: { id: unitId } });

    const stock = Math.max(0, unit.product.stock - 1);
    return tx.product.update({
      where: { id: unit.productId },
      data: {
        stock,
        status: getStockStatus(stock),
      },
      include: productInclude,
    });
  });

  return toInventoryItem(updated);
};
