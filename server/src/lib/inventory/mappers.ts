import type { Branch, Product, InventoryUnit, ProductImage, Sale } from "@prisma/client";
import type { InventoryItem, MarketRatesCurrent } from "../../types.js";
import { moneyToNumber } from "../money.js";
import {
  computeLiveListPriceForProduct,
  resolveUnitDisplayPrice,
} from "./unit-pricing.js";
import { isHallmarked, requiresHallmark } from "../hallmark/requires-hallmark.js";

type ProductWithRelations = Product & {
  branch?: Branch;
  units: Array<InventoryUnit & { branch?: Branch; sale?: Sale | null }>;
  images: ProductImage[];
};

type InventoryItemOptions = {
  stockBranchId?: string;
  marketRates?: MarketRatesCurrent;
  transferLocationByItemCode?: Map<string, string>;
  branchTransferDateByItemCode?: Map<string, string>;
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

      const transferLocation =
        options.transferLocationByItemCode?.get(unit.itemCode);
      const unitBranchName = unit.branch?.name;
      const branchName =
        (unit.status === "Transferred" || unit.status === "InTransit") &&
        transferLocation
          ? unit.status === "InTransit"
            ? `In transit → ${transferLocation}`
            : transferLocation
          : (unitBranchName ?? transferLocation);

      return {
        id: unit.id,
        itemCode: unit.itemCode,
        sku: product.sku,
        branchId: unit.branchId,
        branchName,
        status:
          unit.status === "Available" &&
          options.stockBranchId &&
          unit.branchId !== options.stockBranchId
            ? "Transferred"
            : (unit.status as InventoryItem["units"][0]["status"]),
        price,
        priceSource,
        createdAt: unit.createdAt.toISOString(),
        branchTransferredAt:
          unit.branchTransferredAt?.toISOString() ??
          options.branchTransferDateByItemCode?.get(unit.itemCode),
        huid: unit.huid ?? undefined,
        hallmarkNumber: unit.hallmarkNumber ?? undefined,
        hallmarkPending:
          unit.status === "Available" &&
          requiresHallmark(product) &&
          !isHallmarked(unit),
        heldForCustomerName: unit.heldForCustomerName ?? undefined,
        heldForCustomerId: unit.heldForCustomerId ?? undefined,
        heldAt: unit.heldAt?.toISOString(),
        heldByName: unit.heldByName ?? undefined,
        holdNotes: unit.holdNotes ?? undefined,
        reservedForCustomerName:
          unit.status === "Reserved" &&
          !unit.heldForCustomerName &&
          unit.sale?.paymentStatus === "Pending"
            ? unit.sale.customerName ?? undefined
            : undefined,
      };
    }),
  };
};
