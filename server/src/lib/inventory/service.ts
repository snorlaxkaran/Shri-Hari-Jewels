import { prisma } from "../db.js";
import type {
  Branch,
  StockTransfer as DbStockTransfer,
  StockTransferItem as DbStockTransferItem,
} from "@prisma/client";
import type {
  CreateStockTransferInput,
  InventoryItem,
  NewProductInput,
  StockTransfer,
  UpdateProductInput,
} from "../../types.js";
import { CATEGORY_COLORS, type ProductCategory } from "./categories.js";
import { toInventoryItem } from "./mappers.js";
import { generateSku, generateUnitCodes } from "./sku.js";
import { reconcileInventoryWithSales } from "./reconcile.js";
import { getStockStatus } from "./status.js";
import { syncProductStockInTx } from "./stock-sync.js";
import { recordInventoryAudit } from "./audit.js";
import { DEFAULT_BRANCH_ID } from "../branches/constants.js";
import { moneyToNumber, sumMoney } from "../money.js";
import { repairCompletedRunInventorySkus } from "../production-runs/run-completion.js";

const productInclude = {
  units: {
    include: { branch: true },
    orderBy: { createdAt: "asc" as const },
  },
  images: { orderBy: { sortOrder: "asc" as const } },
};

export const listProducts = async (
  branchId?: string,
): Promise<InventoryItem[]> => {
  await repairCompletedRunInventorySkus();

  const stockBranchId = branchId ?? DEFAULT_BRANCH_ID;
  const products = await prisma.product.findMany({
    where: branchId ? { units: { some: { branchId } } } : undefined,
    include: branchId
      ? {
          units: {
            where: { branchId },
            include: { branch: true },
            orderBy: { createdAt: "asc" as const },
          },
          images: { orderBy: { sortOrder: "asc" as const } },
        }
      : productInclude,
    orderBy: { createdAt: "desc" },
  });
  return products
    .map((product) => toInventoryItem(product, { stockBranchId }))
    .filter((item) => item.units.length > 0);
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

    await syncProductStockInTx(tx, productId);

    return tx.product.findUniqueOrThrow({
      where: { id: productId },
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

const TRANSFER_DOC_TYPES = ["Wholesale GST Invoice", "Delivery Challan"];

type StockTransferWithRelations = DbStockTransfer & {
  fromBranch: Branch;
  toBranch: Branch;
  items: DbStockTransferItem[];
};

const toStockTransfer = (
  transfer: StockTransferWithRelations,
): StockTransfer => ({
  id: transfer.id,
  transferNo: transfer.transferNo,
  fromBranchId: transfer.fromBranchId,
  fromBranchName: transfer.fromBranch.name,
  toBranchId: transfer.toBranchId,
  toBranchName: transfer.toBranch.name,
  documentType: transfer.documentType as StockTransfer["documentType"],
  transferDate: transfer.transferDate.toISOString(),
  itemCount: transfer.itemCount,
  totalValue: moneyToNumber(transfer.totalValue),
  createdByName: transfer.createdByName,
  createdAt: transfer.createdAt.toISOString(),
  items: transfer.items.map((item) => ({
    id: item.id,
    itemCode: item.itemCode,
    productId: item.productId,
    productName: item.productName,
    sku: item.sku,
    metal: item.metal,
    purity: item.purity,
    price: moneyToNumber(item.price),
  })),
});

const nextTransferNo = async (): Promise<string> => {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `TRF-${year}-`;
  const latest = await prisma.stockTransfer.findFirst({
    where: { transferNo: { startsWith: prefix } },
    orderBy: { transferNo: "desc" },
    select: { transferNo: true },
  });
  const lastNumber = latest
    ? Number(latest.transferNo.replace(prefix, "")) || 0
    : 0;
  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
};

export const listStockTransfers = async (): Promise<StockTransfer[]> => {
  const transfers = await prisma.stockTransfer.findMany({
    include: {
      fromBranch: true,
      toBranch: true,
      items: { orderBy: { itemCode: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return transfers.map(toStockTransfer);
};

export const transferInventoryUnits = async (
  productId: string,
  unitIds: string[],
  toBranchId: string,
): Promise<InventoryItem | null> => {
  if (unitIds.length === 0) {
    throw new InventoryError("Select at least one unit to transfer.");
  }

  const branch = await prisma.branch.findUnique({ where: { id: toBranchId } });
  if (!branch || !branch.active) {
    throw new InventoryError("Destination store is not active.", 404);
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: productInclude,
  });
  if (!product) return null;

  const units = await prisma.inventoryUnit.findMany({
    where: { id: { in: unitIds }, productId },
  });

  if (units.length !== unitIds.length) {
    throw new InventoryError("Some selected units were not found.", 404);
  }

  const blocked = units.find((unit) => unit.status !== "Available");
  if (blocked) {
    throw new InventoryError(
      `Cannot transfer ${blocked.itemCode} because it is ${blocked.status}.`,
    );
  }

  await prisma.inventoryUnit.updateMany({
    where: { id: { in: unitIds }, productId },
    data: { branchId: toBranchId },
  });

  const updated = await prisma.product.findUnique({
    where: { id: productId },
    include: productInclude,
  });

  return updated ? toInventoryItem(updated) : null;
};

export const createStockTransfer = async (
  input: CreateStockTransferInput,
  createdBy: { id: string; name: string },
): Promise<{ transfer: StockTransfer; products: InventoryItem[] }> => {
  if (!TRANSFER_DOC_TYPES.includes(input.documentType)) {
    throw new InventoryError("Select a valid transfer document type.");
  }

  const transferDate = new Date(input.transferDate);
  if (Number.isNaN(transferDate.getTime())) {
    throw new InventoryError("Select a valid transfer date.");
  }

  const itemCodes = input.itemCodes;
  const toBranchId = input.toBranchId;
  const cleanCodes = [...new Set(itemCodes.map((code) => code.trim()).filter(Boolean))];
  if (cleanCodes.length === 0) {
    throw new InventoryError("Scan at least one item to transfer.");
  }

  const branch = await prisma.branch.findUnique({ where: { id: toBranchId } });
  if (!branch || !branch.active) {
    throw new InventoryError("Destination store is not active.", 404);
  }

  const units = await prisma.inventoryUnit.findMany({
    where: { itemCode: { in: cleanCodes } },
    include: { product: true },
  });

  if (units.length !== cleanCodes.length) {
    const found = new Set(units.map((unit) => unit.itemCode));
    const missing = cleanCodes.find((code) => !found.has(code));
    throw new InventoryError(`Item code not found: ${missing}`, 404);
  }

  const blocked = units.find((unit) => unit.status !== "Available");
  if (blocked) {
    throw new InventoryError(
      `Cannot transfer ${blocked.itemCode} because it is ${blocked.status}.`,
    );
  }

  const notInAdminStock = units.find((unit) => unit.branchId !== DEFAULT_BRANCH_ID);
  if (notInAdminStock) {
    throw new InventoryError(
      `${notInAdminStock.itemCode} is not available in admin stock.`,
      400,
    );
  }

  const transferNo = await nextTransferNo();
  const totalValue = moneyToNumber(
    sumMoney(units.map((unit) => unit.product.price)),
  );

  const transfer = await prisma.$transaction(async (tx) => {
    const created = await tx.stockTransfer.create({
      data: {
        transferNo,
        fromBranchId: DEFAULT_BRANCH_ID,
        toBranchId,
        documentType: input.documentType,
        transferDate,
        itemCount: units.length,
        totalValue,
        createdById: createdBy.id,
        createdByName: createdBy.name,
        items: {
          create: units.map((unit) => ({
            itemCode: unit.itemCode,
            productId: unit.productId,
            productName: unit.product.name,
            sku: unit.product.sku,
            metal: unit.product.metal,
            purity: unit.product.purity,
            price: unit.product.price,
          })),
        },
      },
    });

    await tx.inventoryUnit.updateMany({
      where: { itemCode: { in: cleanCodes } },
      data: { branchId: toBranchId },
    });

    return tx.stockTransfer.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        fromBranch: true,
        toBranch: true,
        items: { orderBy: { itemCode: "asc" } },
      },
    });
  });

  const productIds = [...new Set(units.map((unit) => unit.productId))];
  const updatedProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });

  return {
    transfer: toStockTransfer(transfer),
    products: updatedProducts.map((product) =>
      toInventoryItem(product, { stockBranchId: DEFAULT_BRANCH_ID }),
    ),
  };
};

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
    await syncProductStockInTx(tx, unit.productId);

    return tx.product.findUniqueOrThrow({
      where: { id: unit.productId },
      include: productInclude,
    });
  });

  return toInventoryItem(updated);
};

export const repairInventory = async (actor?: {
  id: string;
  name: string;
}) => {
  const report = await reconcileInventoryWithSales();
  await recordInventoryAudit({
    entityType: "Product",
    entityId: "all",
    action: "Reconciliation",
    newValue: report,
    reason: "admin_repair",
    performedById: actor?.id,
    performedByName: actor?.name ?? "System",
  });
  return report;
};
