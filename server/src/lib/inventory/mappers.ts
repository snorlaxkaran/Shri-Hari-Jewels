import type { Product, InventoryUnit, ProductImage } from "@prisma/client";
import type { InventoryItem } from "../../types.js";

type ProductWithRelations = Product & {
  units: InventoryUnit[];
  images: ProductImage[];
};

export const toInventoryItem = (product: ProductWithRelations): InventoryItem => ({
  id: product.id,
  sku: product.sku,
  name: product.name,
  category: product.category,
  metal: product.metal as InventoryItem["metal"],
  purity: product.purity as InventoryItem["purity"],
  weightGrams: product.weightGrams,
  makingCharges: product.makingCharges,
  stoneCarat: product.stoneCarat ?? undefined,
  stock: product.stock,
  price: product.price,
  status: product.status as InventoryItem["status"],
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
    status: unit.status as InventoryItem["units"][0]["status"],
    createdAt: unit.createdAt.toISOString(),
  })),
});
