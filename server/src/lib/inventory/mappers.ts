import type { Branch, Product, InventoryUnit, ProductImage } from "@prisma/client";
import type { InventoryItem } from "../../types.js";
import { moneyToNumber } from "../money.js";

type ProductWithRelations = Product & {
  units: Array<InventoryUnit & { branch?: Branch }>;
  images: ProductImage[];
};

type InventoryItemOptions = {
  stockBranchId?: string;
};

export const toInventoryItem = (
  product: ProductWithRelations,
  options: InventoryItemOptions = {},
): InventoryItem => ({
  id: product.id,
  sku: product.sku,
  name: product.name,
  category: product.category,
  metal: product.metal as InventoryItem["metal"],
  purity: product.purity as InventoryItem["purity"],
  weightGrams: product.weightGrams,
  makingCharges: moneyToNumber(product.makingCharges),
  stoneCarat: product.stoneCarat ?? undefined,
  stock: product.units.filter(
    (unit) =>
      unit.status === "Available" &&
      (!options.stockBranchId || unit.branchId === options.stockBranchId),
  ).length,
  price: moneyToNumber(product.price),
  status: product.units.some(
    (unit) =>
      unit.status === "Available" &&
      (!options.stockBranchId || unit.branchId === options.stockBranchId),
  )
    ? product.units.filter(
        (unit) =>
          unit.status === "Available" &&
          (!options.stockBranchId || unit.branchId === options.stockBranchId),
      ).length <= 2
      ? "Low Stock"
      : "In Stock"
    : "Out of Stock",
  imageColor: product.imageColor,
  createdAt: product.createdAt.toISOString(),
  images: product.images
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => ({
      id: img.id,
      url: img.url,
      name: img.name,
    })),
  units: product.units.map((unit) => ({
    id: unit.id,
    itemCode: unit.itemCode,
    sku: product.sku,
    branchId: unit.branchId,
    branchName: unit.branch?.name,
    status:
      unit.status === "Available" &&
      options.stockBranchId &&
      unit.branchId !== options.stockBranchId
        ? "Transferred"
        : (unit.status as InventoryItem["units"][0]["status"]),
    createdAt: unit.createdAt.toISOString(),
  })),
});
