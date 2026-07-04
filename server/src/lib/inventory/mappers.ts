import type { Branch, Product, InventoryUnit, ProductImage, Sale } from "@prisma/client";
import type { InventoryItem, MarketRatesCurrent } from "../../types.js";
import { moneyToNumber } from "../money.js";
import {
  computeLiveListPriceForProduct,
  resolveUnitDisplayPrice,
} from "./unit-pricing.js";

type ProductWithRelations = Product & {
  branch?: Branch;
  units: Array<InventoryUnit & { branch?: Branch; sale?: Sale | null }>;
  images: ProductImage[];
};

type InventoryItemOptions = {
  stockBranchId?: string;
  marketRates?: MarketRatesCurrent;
};

export const toInventoryItem = (
  product: ProductWithRelations,
  options: InventoryItemOptions = {},
): InventoryItem => {
  const hasAvailableInBranch = product.units.some(
    (unit) =>
      unit.status === "Available" &&
      (!options.stockBranchId || unit.branchId === options.stockBranchId),
  );

  const catalogPrice =
    options.marketRates && hasAvailableInBranch
      ? computeLiveListPriceForProduct(product, options.marketRates)
      : moneyToNumber(product.price);

  return {
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
    price: catalogPrice,
    status: hasAvailableInBranch
      ? product.units.filter(
          (unit) =>
            unit.status === "Available" &&
            (!options.stockBranchId || unit.branchId === options.stockBranchId),
        ).length <= 2
        ? "Low Stock"
        : "In Stock"
      : "Out of Stock",
    imageColor: product.imageColor,
    branchId: product.branchId,
    branchName: product.branch?.name,
    createdAt: product.createdAt.toISOString(),
    images: product.images
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => ({
        id: img.id,
        url: img.url,
        name: img.name,
      })),
    units: product.units.map((unit) => {
      const { price, priceSource } = resolveUnitDisplayPrice(
        unit,
        product,
        options.marketRates,
      );

      return {
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
        price,
        priceSource,
        createdAt: unit.createdAt.toISOString(),
      };
    }),
  };
};
