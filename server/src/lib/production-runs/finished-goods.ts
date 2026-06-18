import type { Prisma } from "@prisma/client";
import { CATEGORY_COLORS, type ProductCategory } from "../inventory/categories.js";
import { generateSku, generateUnitCodes } from "../inventory/sku.js";
import { getStockStatus } from "../inventory/status.js";
import { syncProductStockInTx } from "../inventory/stock-sync.js";
import { moneyToNumber } from "../money.js";
import {
  calculateJewelryPrice,
  mapMetalLotsForPricing,
} from "../pricing/jewelry-price.js";
import type {
  FinishedGoodsInput,
  JewelryPriceBreakdown,
  MetalType,
  Purity,
} from "../../types.js";
import { ProductionRunError } from "./errors.js";

type TransactionClient = Prisma.TransactionClient;

const DESIGN_TO_PRODUCT_CATEGORY: Record<string, ProductCategory> = {
  Earring: "Earrings",
  Necklace: "Necklaces",
  Ring: "Rings",
  Bangle: "Bangles",
  Bracelet: "Others",
  Pendant: "Others",
  Other: "Others",
};

export const mapDesignCategoryToProduct = (
  designCategory?: string | null,
): ProductCategory => {
  if (!designCategory) return "Others";
  return DESIGN_TO_PRODUCT_CATEGORY[designCategory] ?? "Others";
};

type RunForPricing = {
  setsOrdered: number;
  design: {
    code: string;
    name: string | null;
    category: string | null;
    metal: string | null;
    purity: string | null;
    makingChargesPerSet: { toString(): string } | null;
  };
  items: Array<{
    elementName: string;
    elementType: string;
    qtyPerSet: number;
    unitValue: { toString(): string } | null;
    weightGramsPerPc: number | null;
    metalWeightGrams: number | null;
    metalLotId: string | null;
    czWeight: number | null;
  }>;
};

export const buildFinishedGoodsFromRun = (
  run: RunForPricing,
  metalLots: Array<{
    id: string;
    metalType: string;
    purity: string;
    currentRate: { toString(): string } | number;
  }>,
): {
  name: string;
  category: ProductCategory;
  quantity: number;
  metal: MetalType;
  purity: Purity;
  weightGrams: number;
  makingCharges: number;
  stoneCarat?: number;
  price: number;
  priceBreakdown: JewelryPriceBreakdown;
} => {
  const metal = (run.design.metal as MetalType) || "Gold";
  const purity = (run.design.purity as Purity) || "22K";
  const makingChargesPerSet =
    run.design.makingChargesPerSet != null
      ? moneyToNumber(String(run.design.makingChargesPerSet))
      : 0;

  const pricingItems = run.items.map((item) => ({
    elementName: item.elementName,
    elementType: item.elementType,
    qtyPerSet: item.qtyPerSet,
    unitValue:
      item.unitValue != null
        ? moneyToNumber(String(item.unitValue))
        : undefined,
    weightGramsPerPc: item.weightGramsPerPc ?? undefined,
    metalWeightGrams: item.metalWeightGrams ?? undefined,
    metalLotId: item.metalLotId ?? undefined,
    czWeight: item.czWeight ?? undefined,
  }));

  const priceBreakdown = calculateJewelryPrice({
    items: pricingItems,
    metal,
    purity,
    makingChargesPerSet,
    metalLots: mapMetalLotsForPricing(metalLots),
  });

  return {
    name: run.design.name?.trim() || run.design.code,
    category: mapDesignCategoryToProduct(run.design.category),
    quantity: run.setsOrdered,
    metal,
    purity,
    weightGrams: priceBreakdown.weightGrams,
    makingCharges: priceBreakdown.makingCharges,
    stoneCarat:
      priceBreakdown.stoneCarat > 0 ? priceBreakdown.stoneCarat : undefined,
    price: priceBreakdown.totalPrice,
    priceBreakdown,
  };
};

export const buildFinishedGoodsDefaults = buildFinishedGoodsFromRun;

export const createFinishedGoodsInTx = async (
  tx: TransactionClient,
  run: {
    id: string;
    runNo: string;
    branchId: string;
    setsOrdered: number;
    finishedGoodsProductId: string | null;
  },
  input: FinishedGoodsInput,
): Promise<string> => {
  if (run.finishedGoodsProductId) {
    throw new ProductionRunError(
      "Finished goods were already created for this production run.",
    );
  }

  const category = input.category as ProductCategory;
  const quantity = run.setsOrdered;

  const existing = await tx.product.findMany({
    where: { branchId: run.branchId },
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
  const unitCodes = generateUnitCodes(sku, quantity, existingUnitCodes);

  const product = await tx.product.create({
    data: {
      branchId: run.branchId,
      sku,
      name: input.name.trim(),
      category: input.category,
      metal: input.metal,
      purity: input.purity,
      weightGrams: input.weightGrams,
      makingCharges: input.makingCharges,
      stoneCarat: input.stoneCarat,
      price: input.price,
      stock: quantity,
      status: getStockStatus(quantity),
      imageColor: CATEGORY_COLORS[category] ?? "#a1a1aa",
      productionRunId: run.id,
      units: {
        create: unitCodes.map((itemCode) => ({
          branchId: run.branchId,
          itemCode,
          status: "Available",
        })),
      },
      images: {
        create: (input.images ?? []).map((img, index) => ({
          url: img.url,
          name: img.name,
          sortOrder: index,
        })),
      },
    },
  });

  await syncProductStockInTx(tx, product.id);

  await tx.productionRun.update({
    where: { id: run.id },
    data: { finishedGoodsProductId: product.id },
  });

  return product.id;
};
