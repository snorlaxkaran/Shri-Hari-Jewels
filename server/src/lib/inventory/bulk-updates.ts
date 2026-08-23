import { InventoryUnitStatus, ProductStockStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { listProductCollections } from "../product-collections/service.js";
import { recordInventoryAuditInTx, type AuditActor } from "./audit.js";
import { InventoryError } from "./service.js";
import { syncProductStockInTx } from "./stock-sync.js";
import type {
  BulkCollectionChangeRow,
  BulkItemUpdateRow,
  BulkSkuChangeRow,
  BulkUpdateResult,
} from "../../types.js";
import { moneyToNumber, toMoney } from "../money.js";

const MAX_ROWS = 5000;

/** Sheet values that mean "no collection assigned". */
const BLANK_TOKENS = new Set(["", "-", "none", "no collection", "null", "n/a", "na"]);

const isBlankToken = (value: string) => BLANK_TOKENS.has(value.trim().toLowerCase());

const normalizeSku = (value: string) => value.trim().toUpperCase();

const assertRowCount = (count: number) => {
  if (count === 0) {
    throw new InventoryError("No rows to update.", 400);
  }
  if (count > MAX_ROWS) {
    throw new InventoryError(
      `Too many rows (${count}). Split the sheet into files of ${MAX_ROWS} rows or fewer.`,
      400,
    );
  }
};

type CollectionRef = { id: string; name: string; isActive: boolean };

/**
 * Resolves a sheet cell that may hold either a collection id or a collection name.
 * Returns undefined when the value matches no known collection.
 */
const resolveCollection = (
  value: string,
  byId: Map<string, CollectionRef>,
  byName: Map<string, CollectionRef>,
): CollectionRef | undefined =>
  byId.get(value.trim()) ?? byName.get(value.trim().toLowerCase());

/**
 * Reassigns products to a different ProductCollection, keyed by SKU.
 * The sheet's "current collection" column is verified first so a stale sheet
 * cannot silently overwrite a collection that changed since it was downloaded.
 */
export const bulkChangeProductCollections = async (
  rows: BulkCollectionChangeRow[],
  organizationId: string,
  actor: AuditActor,
): Promise<BulkUpdateResult> => {
  assertRowCount(rows.length);

  // Archived collections stay resolvable so the "current collection" check still
  // works on an older sheet, but they are rejected as targets below.
  const collections = await listProductCollections(organizationId, false);
  const toRef = (c: CollectionRef): CollectionRef => ({
    id: c.id,
    name: c.name,
    isActive: c.isActive,
  });
  const byId = new Map(collections.map((c) => [c.id, toRef(c)]));
  const byName = new Map(collections.map((c) => [c.name.toLowerCase(), toRef(c)]));

  const skus = [...new Set(rows.map((row) => normalizeSku(row.sku)))];
  const products = await prisma.product.findMany({
    where: { organizationId, sku: { in: skus } },
    select: {
      id: true,
      sku: true,
      productCollectionId: true,
      productCollection: { select: { id: true, name: true } },
    },
  });
  const productBySku = new Map(products.map((product) => [product.sku, product]));

  let updated = 0;
  let unchanged = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const sku = normalizeSku(row.sku);
    const label = `SKU ${sku}`;

    const product = productBySku.get(sku);
    if (!product) {
      errors.push(`${label}: not found in inventory.`);
      continue;
    }

    const target = resolveCollection(row.newCollection, byId, byName);
    if (!target) {
      errors.push(
        `${label}: collection "${row.newCollection.trim()}" does not exist. Create it under Products first.`,
      );
      continue;
    }
    if (!target.isActive) {
      errors.push(`${label}: collection "${target.name}" is archived. Row skipped.`);
      continue;
    }

    const currentName = product.productCollection?.name ?? "";
    const expected = row.currentCollection?.trim() ?? "";
    if (expected) {
      if (isBlankToken(expected)) {
        if (product.productCollectionId) {
          errors.push(
            `${label}: sheet says no current collection, but it is in "${currentName}". Row skipped.`,
          );
          continue;
        }
      } else {
        const expectedRef = resolveCollection(expected, byId, byName);
        const matches = expectedRef
          ? expectedRef.id === product.productCollectionId
          : false;
        if (!matches) {
          errors.push(
            `${label}: sheet says current collection is "${expected}", but it is ${
              currentName ? `"${currentName}"` : "unassigned"
            }. Row skipped.`,
          );
          continue;
        }
      }
    }

    if (product.productCollectionId === target.id) {
      unchanged += 1;
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: product.id },
          data: { productCollectionId: target.id },
        });

        await recordInventoryAuditInTx(tx, {
          entityType: "Product",
          entityId: product.id,
          productId: product.id,
          action: "CollectionChanged",
          previousValue: {
            productCollectionId: product.productCollectionId,
            collectionName: currentName || null,
          },
          newValue: { productCollectionId: target.id, collectionName: target.name },
          reason: "bulk_collection_change",
          performedById: actor.id,
          performedByName: actor.name,
        });
      });

      // Keep the cache honest for repeated SKUs later in the same sheet.
      productBySku.set(sku, {
        ...product,
        productCollectionId: target.id,
        productCollection: { id: target.id, name: target.name },
      });
      updated += 1;
    } catch (error) {
      errors.push(
        `${label}: ${error instanceof Error ? error.message : "update failed."}`,
      );
    }
  }

  return { updated, unchanged, productsCreated: 0, errors };
};

/**
 * Moves a single physical piece (item code) under a different SKU.
 * Other pieces under the old SKU are untouched. When the target SKU does not
 * exist yet it is created by copying the piece's current product attributes.
 */
export const bulkChangeUnitSkus = async (
  rows: BulkSkuChangeRow[],
  organizationId: string,
  actor: AuditActor,
): Promise<BulkUpdateResult> => {
  assertRowCount(rows.length);

  let updated = 0;
  let unchanged = 0;
  let productsCreated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const itemCode = row.itemCode.trim();
    const newSku = normalizeSku(row.newSku);
    const label = `Item code ${itemCode}`;

    try {
      const unit = await prisma.inventoryUnit.findUnique({
        where: { organizationId_itemCode: { organizationId, itemCode } },
        include: { product: true },
      });

      if (!unit) {
        errors.push(`${label}: not found in inventory.`);
        continue;
      }
      if (unit.status === InventoryUnitStatus.Sold) {
        errors.push(
          `${label}: already sold — its SKU is kept as a record of the sale and cannot be changed.`,
        );
        continue;
      }

      const source = unit.product;
      if (normalizeSku(source.sku) === newSku) {
        unchanged += 1;
        continue;
      }

      const existingTarget = await prisma.product.findUnique({
        where: { organizationId_sku: { organizationId, sku: newSku } },
        select: { id: true },
      });
      const createdTarget = !existingTarget;

      await prisma.$transaction(async (tx) => {
        const target =
          existingTarget ??
          (await tx.product.create({
            data: {
              organizationId,
              branchId: source.branchId,
              sku: newSku,
              name: source.name,
              category: source.category,
              metal: source.metal,
              purity: source.purity,
              weightGrams: source.weightGrams,
              makingCharges: source.makingCharges,
              stoneCarat: source.stoneCarat,
              price: source.price,
              stock: 0,
              status: ProductStockStatus.OutOfStock,
              imageColor: source.imageColor,
              subCategory: source.subCategory,
              categorySize: source.categorySize,
              stoneInfo: source.stoneInfo,
              hsnCode: source.hsnCode,
              productCollectionId: source.productCollectionId,
            },
            select: { id: true },
          }));

        await tx.inventoryUnit.update({
          where: { id: unit.id },
          data: { productId: target.id },
        });

        await recordInventoryAuditInTx(tx, {
          entityType: "InventoryUnit",
          entityId: unit.id,
          productId: target.id,
          itemCode: unit.itemCode,
          action: "SkuReassigned",
          previousValue: { sku: source.sku, productId: source.id },
          newValue: {
            sku: newSku,
            productId: target.id,
            productCreated: createdTarget,
          },
          reason: "bulk_sku_change",
          performedById: actor.id,
          performedByName: actor.name,
        });

        await syncProductStockInTx(tx, source.id);
        await syncProductStockInTx(tx, target.id);
      });

      if (createdTarget) productsCreated += 1;
      updated += 1;
    } catch (error) {
      errors.push(
        `${label}: ${error instanceof Error ? error.message : "update failed."}`,
      );
    }
  }

  return { updated, unchanged, productsCreated, errors };
};

/**
 * Updates one physical piece (item code) from a Central Stock Excel sheet.
 * Blank columns are ignored. SKU moves reuse the same rules as bulk SKU change;
 * weight and description apply to the SKU the piece ends up under.
 */
export const bulkUpdateInventoryItems = async (
  rows: BulkItemUpdateRow[],
  organizationId: string,
  actor: AuditActor,
): Promise<BulkUpdateResult> => {
  assertRowCount(rows.length);

  let updated = 0;
  let unchanged = 0;
  let productsCreated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const itemCode = row.itemCode.trim();
    const label = `Item code ${itemCode}`;
    const newSku = row.newSku?.trim() ? normalizeSku(row.newSku) : undefined;
    const newDescription = row.newDescription?.trim();

    try {
      const unit = await prisma.inventoryUnit.findUnique({
        where: { organizationId_itemCode: { organizationId, itemCode } },
        include: { product: true },
      });

      if (!unit) {
        errors.push(`${label}: not found in inventory.`);
        continue;
      }
      if (unit.status === InventoryUnitStatus.Sold) {
        errors.push(
          `${label}: already sold — its details are kept as a record of the sale and cannot be changed.`,
        );
        continue;
      }

      let rowChanged = false;
      let skuCreated = false;
      const previousValue: Record<string, unknown> = {};
      const newValue: Record<string, unknown> = {};

      await prisma.$transaction(async (tx) => {
        let productId = unit.productId;
        let sourceProduct = unit.product;

        if (newSku && normalizeSku(sourceProduct.sku) !== newSku) {
          const existingTarget = await tx.product.findUnique({
            where: { organizationId_sku: { organizationId, sku: newSku } },
            select: { id: true },
          });
          skuCreated = !existingTarget;

          const target =
            existingTarget ??
            (await tx.product.create({
              data: {
                organizationId,
                branchId: sourceProduct.branchId,
                sku: newSku,
                name: sourceProduct.name,
                category: sourceProduct.category,
                metal: sourceProduct.metal,
                purity: sourceProduct.purity,
                weightGrams: sourceProduct.weightGrams,
                makingCharges: sourceProduct.makingCharges,
                stoneCarat: sourceProduct.stoneCarat,
                price: sourceProduct.price,
                stock: 0,
                status: ProductStockStatus.OutOfStock,
                imageColor: sourceProduct.imageColor,
                subCategory: sourceProduct.subCategory,
                categorySize: sourceProduct.categorySize,
                stoneInfo: sourceProduct.stoneInfo,
                hsnCode: sourceProduct.hsnCode,
                productCollectionId: sourceProduct.productCollectionId,
              },
              select: { id: true },
            }));

          await tx.inventoryUnit.update({
            where: { id: unit.id },
            data: { productId: target.id },
          });

          previousValue.sku = sourceProduct.sku;
          newValue.sku = newSku;
          if (skuCreated) newValue.productCreated = true;

          productId = target.id;
          await syncProductStockInTx(tx, sourceProduct.id);
          await syncProductStockInTx(tx, target.id);
          rowChanged = true;
        }

        const product = await tx.product.findUniqueOrThrow({
          where: { id: productId },
        });
        const freshUnit = await tx.inventoryUnit.findUniqueOrThrow({
          where: { id: unit.id },
        });

        const unitData: {
          listPrice?: ReturnType<typeof toMoney>;
          costPrice?: ReturnType<typeof toMoney>;
        } = {};

        if (row.newPrice !== undefined) {
          const current =
            freshUnit.listPrice != null
              ? moneyToNumber(freshUnit.listPrice)
              : null;
          if (current !== row.newPrice) {
            unitData.listPrice = toMoney(row.newPrice);
            previousValue.price = current;
            newValue.price = row.newPrice;
            rowChanged = true;
          }
        }

        if (row.newCost !== undefined) {
          const current =
            freshUnit.costPrice != null
              ? moneyToNumber(freshUnit.costPrice)
              : null;
          if (current !== row.newCost) {
            unitData.costPrice = toMoney(row.newCost);
            previousValue.cost = current;
            newValue.cost = row.newCost;
            rowChanged = true;
          }
        }

        const productData: { weightGrams?: number; name?: string } = {};

        if (row.newWeight !== undefined && product.weightGrams !== row.newWeight) {
          productData.weightGrams = row.newWeight;
          previousValue.weightGrams = product.weightGrams;
          newValue.weightGrams = row.newWeight;
          rowChanged = true;
        }

        if (newDescription && product.name !== newDescription) {
          productData.name = newDescription;
          previousValue.name = product.name;
          newValue.name = newDescription;
          rowChanged = true;
        }

        if (Object.keys(unitData).length > 0) {
          await tx.inventoryUnit.update({
            where: { id: unit.id },
            data: unitData,
          });
        }

        if (Object.keys(productData).length > 0) {
          await tx.product.update({
            where: { id: productId },
            data: productData,
          });
        }

        if (rowChanged) {
          await recordInventoryAuditInTx(tx, {
            entityType: "InventoryUnit",
            entityId: unit.id,
            productId,
            itemCode: unit.itemCode,
            action: "BulkItemUpdated",
            previousValue,
            newValue,
            reason: "bulk_item_update",
            performedById: actor.id,
            performedByName: actor.name,
          });
        }
      });

      if (rowChanged) {
        updated += 1;
        if (skuCreated) productsCreated += 1;
      } else {
        unchanged += 1;
      }
    } catch (error) {
      errors.push(
        `${label}: ${error instanceof Error ? error.message : "update failed."}`,
      );
    }
  }

  return { updated, unchanged, productsCreated, errors };
};
