import type { Prisma } from "@prisma/client";
import { CATEGORY_COLORS, type ProductCategory } from "../inventory/categories.js";
import { generateSku, generateUnitCodes } from "../inventory/sku.js";
import { getStockStatus } from "../inventory/status.js";
import { syncProductStockInTx } from "../inventory/stock-sync.js";
import type { FinishedGoodsInput } from "../../types.js";
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

export const buildFinishedGoodsDefaults = (run: {
  runNo: string;
  setsOrdered: number;
  design: {
    code: string;
    name: string | null;
    category: string | null;
  };
  items: Array<{ czWeight: number | null }>;
}): Omit<FinishedGoodsInput, "metal" | "purity" | "weightGrams" | "makingCharges" | "price"> & {
  quantity: number;
} => {
  const stoneCarat = run.items.reduce(
    (sum, item) => sum + (item.czWeight ?? 0),
    0,
  );

  return {
    name: run.design.name?.trim() || run.design.code,
    category: mapDesignCategoryToProduct(run.design.category),
    quantity: run.setsOrdered,
    stoneCarat: stoneCarat > 0 ? stoneCarat : undefined,
  };
};

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
