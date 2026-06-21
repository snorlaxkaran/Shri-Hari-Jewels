import type { Prisma } from "@prisma/client";
import { CATEGORY_COLORS, type ProductCategory } from "../inventory/categories.js";
import { generateUnitCodes } from "../inventory/sku.js";
import { getStockStatus } from "../inventory/status.js";
import { syncProductStockInTx } from "../inventory/stock-sync.js";
import { moneyToNumber } from "../money.js";
import {
  calculateJewelryPrice,
  calculatePhysicalMetalWeightPerSet,
  mapMetalLotsForPricing,
} from "../pricing/jewelry-price.js";
import type {
  FinishedGoodsInput,
  JewelryPriceBreakdown,
  MetalType,
  Purity,
} from "../../types.js";
import {
  isValidDesignMetal,
  isValidDesignPurity,
} from "../designs/validation.js";
import { ProductionRunError } from "./errors.js";
import { weightsMatch } from "../weight-reconciliation.js";

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

export const normalizeDesignSku = (designCode: string): string =>
  designCode.trim().toUpperCase();

export const RUN_FOR_FINISHED_GOODS_INCLUDE = {
  design: {
    select: {
      code: true,
      name: true,
      category: true,
      metal: true,
      purity: true,
      makingChargesPerSet: true,
      finishedPhotoUrl: true,
      finishedPhotoUrls: true,
    },
  },
  items: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      elementName: true,
      elementType: true,
      qtyPerSet: true,
      unitValue: true,
      weightGramsPerPc: true,
      metalWeightGrams: true,
      metalLotId: true,
      czWeight: true,
      motifId: true,
    },
  },
} as const;

type RunItemWeightSource = RunForPricing["items"][number] & {
  motifId?: string | null;
};

export const hydrateRunItemWeights = (
  items: RunItemWeightSource[],
  designElements: Array<{
    name: string;
    type: string;
    weightGramsPerPc: number | null;
    motifId: string | null;
  }>,
  motifWeightById: Map<string, number>,
): RunForPricing["items"] =>
  items.map((item) => {
    let weightGramsPerPc = item.weightGramsPerPc;
    const designEl = designElements.find(
      (el) => el.type === item.elementType && el.name === item.elementName,
    );

    if (weightGramsPerPc == null || weightGramsPerPc <= 0) {
      if (designEl?.weightGramsPerPc != null && designEl.weightGramsPerPc > 0) {
        weightGramsPerPc = designEl.weightGramsPerPc;
      }
    }

    if (weightGramsPerPc == null || weightGramsPerPc <= 0) {
      const motifId = item.motifId ?? designEl?.motifId;
      if (motifId) {
        const motifWeight = motifWeightById.get(motifId);
        if (motifWeight != null && motifWeight > 0) {
          weightGramsPerPc = motifWeight;
        }
      }
    }

    return {
      elementName: item.elementName,
      elementType: item.elementType,
      qtyPerSet: item.qtyPerSet,
      unitValue: item.unitValue,
      weightGramsPerPc,
      metalWeightGrams: item.metalWeightGrams,
      metalLotId: item.metalLotId,
      czWeight: item.czWeight,
    };
  });

export const calculateFinishedGoodsForRunInTx = async (
  tx: TransactionClient,
  runId: string,
  branchId: string,
): Promise<ReturnType<typeof buildFinishedGoodsFromRun>> => {
  const run = await tx.productionRun.findUniqueOrThrow({
    where: { id: runId },
    include: RUN_FOR_FINISHED_GOODS_INCLUDE,
  });

  const designElements = await tx.designElement.findMany({
    where: { designId: run.designId },
    select: {
      name: true,
      type: true,
      weightGramsPerPc: true,
      motifId: true,
    },
  });

  const motifIds = new Set<string>();
  for (const item of run.items) {
    if (item.motifId) motifIds.add(item.motifId);
  }
  for (const element of designElements) {
    if (element.motifId) motifIds.add(element.motifId);
  }

  const motifs =
    motifIds.size > 0
      ? await tx.motif.findMany({
          where: { id: { in: [...motifIds] } },
          select: { id: true, weightGrams: true },
        })
      : [];

  const motifWeightById = new Map<string, number>();
  for (const motif of motifs) {
    if (motif.weightGrams != null && motif.weightGrams > 0) {
      motifWeightById.set(motif.id, motif.weightGrams);
    }
  }

  const hydratedItems = hydrateRunItemWeights(
    run.items,
    designElements,
    motifWeightById,
  );

  const metalLots = await tx.metalLot.findMany({
    where: { branchId },
    select: {
      id: true,
      metalType: true,
      purity: true,
      currentRate: true,
    },
  });

  return buildFinishedGoodsFromRun(
    {
      setsOrdered: run.setsOrdered,
      design: run.design,
      items: hydratedItems,
    },
    metalLots,
  );
};

export const assertPositiveFinishedGoodsWeight = (weightGrams: number): void => {
  if (weightGrams > 0) return;
  throw new ProductionRunError(
    "Cannot create inventory SKU with zero weight. Ensure every motif and casting element has a weight (g) on the design bill of materials.",
  );
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
  sku: string;
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
  if (!run.design.metal || !isValidDesignMetal(run.design.metal)) {
    throw new ProductionRunError(
      "Design metal is not set. Update the design before completing this run.",
    );
  }
  if (!run.design.purity || !isValidDesignPurity(run.design.purity)) {
    throw new ProductionRunError(
      "Design purity is not set. Update the design before completing this run.",
    );
  }
  const metal = run.design.metal;
  const purity = run.design.purity;
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

  const weightGrams = calculatePhysicalMetalWeightPerSet(pricingItems);

  return {
    sku: normalizeDesignSku(run.design.code),
    name: run.design.name?.trim() || run.design.code,
    category: mapDesignCategoryToProduct(run.design.category),
    quantity: run.setsOrdered,
    metal,
    purity,
    weightGrams,
    makingCharges: priceBreakdown.makingCharges,
    stoneCarat:
      priceBreakdown.stoneCarat > 0 ? priceBreakdown.stoneCarat : undefined,
    price: priceBreakdown.totalPrice,
    priceBreakdown,
  };
};

export const buildFinishedGoodsDefaults = buildFinishedGoodsFromRun;

const addUnitsToExistingProductInTx = async (
  tx: TransactionClient,
  productId: string,
  branchId: string,
  sku: string,
  quantity: number,
): Promise<void> => {
  const allUnits = await tx.inventoryUnit.findMany({
    select: { itemCode: true },
  });
  const existingUnitCodes = allUnits.map((unit) => unit.itemCode);
  const unitCodes = generateUnitCodes(sku, quantity, existingUnitCodes);

  await tx.inventoryUnit.createMany({
    data: unitCodes.map((itemCode) => ({
      branchId,
      itemCode,
      productId,
      status: "Available",
    })),
  });

  await syncProductStockInTx(tx, productId);
};

export const createFinishedGoodsInTx = async (
  tx: TransactionClient,
  run: {
    id: string;
    runNo: string;
    branchId: string;
    setsOrdered: number;
    designCode: string;
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
  const sku = normalizeDesignSku(run.designCode);

  const allUnits = await tx.inventoryUnit.findMany({
    select: { itemCode: true },
  });
  const existingUnitCodes = allUnits.map((unit) => unit.itemCode);

  const existingProduct = await tx.product.findUnique({
    where: { sku },
    select: { id: true, branchId: true, productionRunId: true },
  });

  if (existingProduct) {
    if (existingProduct.branchId !== run.branchId) {
      throw new ProductionRunError(
        `SKU ${sku} already exists in another branch.`,
      );
    }

    await addUnitsToExistingProductInTx(
      tx,
      existingProduct.id,
      run.branchId,
      sku,
      quantity,
    );

    await tx.product.update({
      where: { id: existingProduct.id },
      data: {
        weightGrams: input.weightGrams,
        makingCharges: input.makingCharges,
        price: input.price,
        stoneCarat: input.stoneCarat ?? null,
        metal: input.metal,
        purity: input.purity,
      },
    });

    await tx.productionRun.update({
      where: { id: run.id },
      data: { finishedGoodsProductId: existingProduct.id },
    });

    return existingProduct.id;
  }

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

export const repairProductSkuFromDesignInTx = async (
  tx: TransactionClient,
  productId: string,
  designCode: string,
): Promise<boolean> => {
  const expectedSku = normalizeDesignSku(designCode);
  const product = await tx.product.findUnique({
    where: { id: productId },
    include: {
      units: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!product || product.sku === expectedSku) {
    return false;
  }

  const conflicting = await tx.product.findUnique({
    where: { sku: expectedSku },
    select: { id: true },
  });
  if (conflicting && conflicting.id !== productId) {
    return false;
  }

  const oldSku = product.sku;
  await tx.product.update({
    where: { id: productId },
    data: { sku: expectedSku },
  });

  const otherUnitCodes = (
    await tx.inventoryUnit.findMany({
      where: { productId: { not: productId } },
      select: { itemCode: true },
    })
  ).map((unit) => unit.itemCode);

  const newCodes = generateUnitCodes(
    expectedSku,
    product.units.length,
    otherUnitCodes,
  );

  for (let index = 0; index < product.units.length; index++) {
    const unit = product.units[index];
    const newItemCode = newCodes[index];
    if (unit.itemCode === newItemCode) continue;

    await tx.inventoryUnit.update({
      where: { id: unit.id },
      data: { itemCode: newItemCode },
    });
  }

  return oldSku !== expectedSku;
};

export const repairProductWeightFromProductionRunInTx = async (
  tx: TransactionClient,
  productId: string,
  runId: string,
  branchId: string,
): Promise<boolean> => {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { weightGrams: true },
  });
  if (!product) return false;

  const calculated = await calculateFinishedGoodsForRunInTx(tx, runId, branchId);
  if (calculated.weightGrams <= 0) return false;

  if (
    product.weightGrams > 0 &&
    weightsMatch(product.weightGrams, calculated.weightGrams)
  ) {
    return false;
  }

  await tx.product.update({
    where: { id: productId },
    data: { weightGrams: calculated.weightGrams },
  });

  return true;
};
