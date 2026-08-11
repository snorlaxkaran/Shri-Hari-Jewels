import {
  InventoryUnitStatus,
} from "@prisma/client";
import type {
  BulkStockImportResult,
  LegacyStockImportRow,
  NewProductInput,
} from "../../types.js";
import { InventoryError } from "./service.js";
import { createProduct } from "./service.js";
import { prisma } from "../db.js";
import { getBranchOrganizationId } from "../organizations/access.js";
import { getCurrentMarketRates } from "../market-rates/service.js";
import { computeLiveListPriceForProduct } from "./unit-pricing.js";
import { recordInventoryAudit, recordUnitsCreatedInTx } from "./audit.js";
import { syncProductStockInTx } from "./stock-sync.js";
import { createEntryVoucherInTx } from "./vouchers-service.js";
import { resolveVendorId } from "../vendors/service.js";
import { resolveStoneTypeIds } from "../stone-types/service.js";
import { listProductCollections } from "../product-collections/service.js";
import { toMoney } from "../money.js";

export type { BulkStockImportResult, LegacyStockImportRow };

const productInclude = {
  branch: true,
  productCollection: { select: { id: true, name: true } },
  units: {
    include: { branch: true, sale: true },
    orderBy: { createdAt: "asc" as const },
  },
  images: { orderBy: { sortOrder: "asc" as const } },
};

const deriveMakingCharges = (
  retailPrice: number,
  weightGrams: number,
  metal: string,
  purity: string,
  marketRates: Awaited<ReturnType<typeof getCurrentMarketRates>>,
): number => {
  const livePrice = computeLiveListPriceForProduct(
    { metal, purity, weightGrams, price: retailPrice },
    marketRates,
  );
  if (livePrice !== retailPrice) {
    return Math.max(0, Math.round((retailPrice - livePrice) * 100) / 100);
  }
  return Math.max(0, Math.round(retailPrice * 0.15 * 100) / 100);
};

const buildProductInput = async (
  catalogNo: string,
  rows: LegacyStockImportRow[],
  marketRates: Awaited<ReturnType<typeof getCurrentMarketRates>>,
  organizationId: string,
  actorName: string,
): Promise<NewProductInput> => {
  const first = rows[0];
  const stoneSuffix = first.stoneName ? ` (${first.stoneName})` : "";

  let productCollectionId: string | undefined;
  if (first.collection?.trim()) {
    const collections = await listProductCollections(organizationId, false);
    const match = collections.find(
      (item) => item.name.toLowerCase() === first.collection!.trim().toLowerCase(),
    );
    productCollectionId = match?.id;
  }

  const vendorId = first.vendor
    ? await resolveVendorId(organizationId, undefined, first.vendor)
    : undefined;

  const stoneTypeIds = first.stoneName
    ? await resolveStoneTypeIds(organizationId, undefined, [first.stoneName], actorName)
    : [];

  return {
    name: first.name.trim() + stoneSuffix,
    category: first.category,
    metal: first.metal as NewProductInput["metal"],
    purity: first.purity as NewProductInput["purity"],
    weightGrams: first.weightGrams,
    makingCharges: deriveMakingCharges(
      first.retailPrice,
      first.weightGrams,
      first.metal,
      first.purity,
      marketRates,
    ),
    price: first.retailPrice,
    quantity: rows.length,
    images: [],
    catalogNo,
    itemCodes: rows.map((row) => row.itemCode),
    subCategory: first.subCategory,
    categorySize: first.categorySize,
    hsnCode: first.hsn,
    productCollectionId,
    vendorId,
    stoneTypeIds,
    costPrice: first.costPrice,
  };
};

export const importLegacyStock = async (
  rows: LegacyStockImportRow[],
  branchId: string,
  actor?: { id: string; name: string },
): Promise<BulkStockImportResult> => {
  if (!rows.length) {
    throw new InventoryError("No rows to import.");
  }

  const organizationId = await getBranchOrganizationId(branchId);
  const marketRates = await getCurrentMarketRates(organizationId);
  const grouped = new Map<string, LegacyStockImportRow[]>();

  for (const row of rows) {
    const key = row.catalogNo.trim().toUpperCase();
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  let created = 0;
  let unitsAdded = 0;
  const errors: string[] = [];
  let voucherId: string | undefined;
  let voucherCode: string | undefined;

  if (actor) {
    const firstVendor = rows.find((row) => row.vendor?.trim())?.vendor;
    const vendorId = firstVendor
      ? await resolveVendorId(organizationId, undefined, firstVendor)
      : undefined;

    const voucher = await prisma.$transaction(async (tx) =>
      createEntryVoucherInTx(tx, organizationId, branchId, actor, vendorId ?? null),
    );
    voucherId = voucher.id;
    voucherCode = voucher.voucherCode;
  }

  const entryOptions = actor
    ? { entryVerification: true, voucherId }
    : undefined;

  for (const [catalogNo, groupRows] of grouped) {
    try {
      const existing = await prisma.product.findUnique({
        where: {
          organizationId_sku: { organizationId, sku: catalogNo },
        },
        include: productInclude,
      });

      if (existing) {
        const orgUnits = await prisma.inventoryUnit.findMany({
          where: { organizationId },
          select: { itemCode: true },
        });
        const existingCodes = new Set(orgUnits.map((u) => u.itemCode));
        const newRows = groupRows.filter(
          (row) => !existingCodes.has(row.itemCode.trim()),
        );

        if (!newRows.length) {
          errors.push(`${catalogNo}: all barcodes already exist — skipped.`);
          continue;
        }

        const unitListPrice = computeLiveListPriceForProduct(
          existing,
          marketRates,
        );

        const firstRow = newRows[0];
        const stoneTypeIds = firstRow?.stoneName
          ? await resolveStoneTypeIds(
              organizationId,
              undefined,
              [firstRow.stoneName],
              actor?.name ?? "System",
            )
          : [];

        await prisma.$transaction(async (tx) => {
          const rowsData = newRows.map((row) => ({
            organizationId,
            branchId: existing.branchId,
            itemCode: row.itemCode.trim(),
            productId: existing.id,
            status: actor
              ? InventoryUnitStatus.PendingVerification
              : InventoryUnitStatus.Available,
            listPrice: row.retailPrice ?? unitListPrice,
            costPrice:
              row.costPrice != null && row.costPrice > 0
                ? toMoney(row.costPrice)
                : null,
            voucherId: voucherId ?? null,
          }));

          await tx.inventoryUnit.createMany({ data: rowsData });

          const createdUnits = await tx.inventoryUnit.findMany({
            where: {
              productId: existing.id,
              itemCode: { in: rowsData.map((row) => row.itemCode) },
            },
            select: { id: true, itemCode: true },
          });

          if (stoneTypeIds.length) {
            await tx.inventoryUnitStoneType.createMany({
              data: createdUnits.flatMap((unit) =>
                stoneTypeIds.map((stoneTypeId, sortOrder) => ({
                  unitId: unit.id,
                  stoneTypeId,
                  sortOrder,
                })),
              ),
              skipDuplicates: true,
            });
          }

          if (actor) {
            await recordUnitsCreatedInTx(
              tx,
              createdUnits.map((unit) => ({
                unitId: unit.id,
                itemCode: unit.itemCode,
                productId: existing.id,
              })),
              actor,
              "pending_entry",
              {
                sku: existing.sku,
                productName: existing.name,
                voucherId,
              },
            );
          }

          await syncProductStockInTx(tx, existing.id);
        });

        unitsAdded += newRows.length;
        continue;
      }

      const input = await buildProductInput(
        catalogNo,
        groupRows,
        marketRates,
        organizationId,
        actor?.name ?? "System",
      );
      await createProduct(input, branchId, actor, entryOptions);
      created += 1;
      unitsAdded += groupRows.length;
    } catch (error) {
      const msg =
        error instanceof InventoryError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Import failed.";
      errors.push(`${catalogNo}: ${msg}`);
    }
  }

  if (actor && (created > 0 || unitsAdded > 0)) {
    await recordInventoryAudit({
      entityType: "Product",
      entityId: actor.id,
      action: "Import",
      newValue: { created, unitsAdded, errors: errors.length, voucherCode },
      reason: `${created} SKU(s), ${unitsAdded} unit(s) imported`,
      performedById: actor.id,
      performedByName: actor.name,
    });
  }

  if (actor && created === 0 && unitsAdded === 0 && voucherId) {
    await prisma.entryVoucher.delete({ where: { id: voucherId } }).catch(() => {});
    voucherId = undefined;
    voucherCode = undefined;
  }

  return { created, unitsAdded, errors, voucherId, voucherCode };
};
