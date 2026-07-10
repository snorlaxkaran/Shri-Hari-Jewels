import {
  EntryVoucherStatus,
  InventoryUnitStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import type { EntryVoucher, EntryVoucherDetail, EntryVoucherItem } from "../../types.js";
import { InventoryError } from "./service.js";
import { syncProductStockInTx } from "./stock-sync.js";
import { recordInventoryAuditInTx } from "./audit.js";
import { nextEntryVoucherCode } from "./voucher-code.js";

type TransactionClient = Prisma.TransactionClient;

export type EntryVoucherActor = { id?: string; name: string };

const voucherInclude = {
  branch: { select: { name: true } },
  units: {
    orderBy: { itemCode: "asc" as const },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          metal: true,
          purity: true,
          weightGrams: true,
        },
      },
    },
  },
} as const;

type DbVoucher = Prisma.EntryVoucherGetPayload<{ include: typeof voucherInclude }>;

const toVoucherItem = (unit: DbVoucher["units"][number]): EntryVoucherItem => ({
  unitId: unit.id,
  itemCode: unit.itemCode,
  productId: unit.productId,
  productName: unit.product.name,
  sku: unit.product.sku,
  metal: unit.product.metal,
  purity: unit.product.purity,
  weightGrams: unit.product.weightGrams,
  listPrice: unit.listPrice != null ? moneyToNumber(unit.listPrice) : null,
  status: unit.status,
});

const toVoucherSummary = (voucher: DbVoucher): EntryVoucher => ({
  id: voucher.id,
  voucherCode: voucher.voucherCode,
  branchId: voucher.branchId,
  branchName: voucher.branch.name,
  createdByUserId: voucher.createdByUserId ?? undefined,
  createdByName: voucher.createdByName,
  createdAt: voucher.createdAt.toISOString(),
  verifiedAt: voucher.verifiedAt?.toISOString(),
  verifiedByUserId: voucher.verifiedByUserId ?? undefined,
  verifiedByName: voucher.verifiedByName ?? undefined,
  status: voucher.status,
  itemCount: voucher.units.length,
  pricedItemCount: voucher.units.filter((unit) => unit.listPrice != null).length,
});

const toVoucherDetail = (voucher: DbVoucher): EntryVoucherDetail => ({
  ...toVoucherSummary(voucher),
  items: voucher.units.map(toVoucherItem),
});

export const createEntryVoucherInTx = async (
  tx: TransactionClient,
  organizationId: string,
  branchId: string,
  actor: EntryVoucherActor,
): Promise<{ id: string; voucherCode: string }> => {
  const voucherCode = await nextEntryVoucherCode(tx, organizationId);
  const voucher = await tx.entryVoucher.create({
    data: {
      organizationId,
      branchId,
      voucherCode,
      createdByUserId: actor.id,
      createdByName: actor.name,
      status: EntryVoucherStatus.Pending,
    },
    select: { id: true, voucherCode: true },
  });
  return voucher;
};

export const listEntryVouchers = async (
  organizationId: string,
  branchId: string | undefined,
  status?: EntryVoucherStatus,
): Promise<EntryVoucher[]> => {
  const vouchers = await prisma.entryVoucher.findMany({
    where: {
      organizationId,
      ...(branchId ? { branchId } : {}),
      ...(status ? { status } : {}),
    },
    include: voucherInclude,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return vouchers.map(toVoucherSummary);
};

export const getEntryVoucherById = async (
  id: string,
  organizationId: string,
): Promise<EntryVoucherDetail | null> => {
  const voucher = await prisma.entryVoucher.findFirst({
    where: { id, organizationId },
    include: voucherInclude,
  });
  return voucher ? toVoucherDetail(voucher) : null;
};

export const updateEntryVoucherPrices = async (
  voucherId: string,
  organizationId: string,
  prices: Array<{ unitId: string; listPrice: number }>,
  actor: EntryVoucherActor,
): Promise<EntryVoucherDetail> => {
  const voucher = await prisma.entryVoucher.findFirst({
    where: { id: voucherId, organizationId },
    select: { id: true, status: true },
  });
  if (!voucher) throw new InventoryError("Voucher not found.", 404);
  if (voucher.status !== EntryVoucherStatus.Pending) {
    throw new InventoryError("Only pending vouchers can be updated.", 400);
  }

  const unitIds = prices.map((row) => row.unitId);
  const units = await prisma.inventoryUnit.findMany({
    where: { voucherId, id: { in: unitIds } },
    select: { id: true },
  });
  if (units.length !== unitIds.length) {
    throw new InventoryError("One or more units are not part of this voucher.", 400);
  }

  await prisma.$transaction(async (tx) => {
    for (const row of prices) {
      if (!Number.isFinite(row.listPrice) || row.listPrice <= 0) {
        throw new InventoryError("Each price must be a positive number.", 400);
      }
      await tx.inventoryUnit.update({
        where: { id: row.unitId },
        data: { listPrice: row.listPrice },
      });
    }

    await recordInventoryAuditInTx(tx, {
      entityType: "InventoryUnit",
      entityId: voucherId,
      action: "VoucherPricesUpdated",
      newValue: { unitCount: prices.length },
      reason: "entry_voucher_price_update",
      performedById: actor.id,
      performedByName: actor.name,
    });
  });

  const updated = await getEntryVoucherById(voucherId, organizationId);
  if (!updated) throw new InventoryError("Voucher not found.", 404);
  return updated;
};

export const deleteEntryVoucher = async (
  voucherId: string,
  organizationId: string,
  actor: EntryVoucherActor,
): Promise<void> => {
  const voucher = await prisma.entryVoucher.findFirst({
    where: { id: voucherId, organizationId },
    include: {
      units: { select: { id: true, productId: true } },
    },
  });
  if (!voucher) throw new InventoryError("Voucher not found.", 404);
  if (voucher.status !== EntryVoucherStatus.Pending) {
    throw new InventoryError("Only pending vouchers can be deleted.", 400);
  }

  const productIds = [...new Set(voucher.units.map((unit) => unit.productId))];

  await prisma.$transaction(async (tx) => {
    await tx.inventoryUnit.deleteMany({ where: { voucherId: voucher.id } });
    await tx.entryVoucher.delete({ where: { id: voucher.id } });

    for (const productId of productIds) {
      await syncProductStockInTx(tx, productId);
    }

    await recordInventoryAuditInTx(tx, {
      entityType: "InventoryUnit",
      entityId: voucher.id,
      action: "VoucherDeleted",
      newValue: {
        voucherCode: voucher.voucherCode,
        itemCount: voucher.units.length,
      },
      reason: "entry_voucher_delete",
      performedById: actor.id,
      performedByName: actor.name,
    });
  });
};

export type VerifyEntryVoucherResult =
  | { ok: true; voucher: EntryVoucherDetail }
  | { ok: false; missingPrices: string[] };

export const verifyEntryVoucher = async (
  voucherId: string,
  organizationId: string,
  actor: EntryVoucherActor,
): Promise<VerifyEntryVoucherResult> => {
  const voucher = await prisma.entryVoucher.findFirst({
    where: { id: voucherId, organizationId },
    include: {
      units: {
        select: {
          id: true,
          itemCode: true,
          productId: true,
          listPrice: true,
        },
      },
    },
  });
  if (!voucher) throw new InventoryError("Voucher not found.", 404);
  if (voucher.status !== EntryVoucherStatus.Pending) {
    throw new InventoryError("This voucher is already verified.", 400);
  }

  const missingPrices = voucher.units
    .filter((unit) => unit.listPrice == null)
    .map((unit) => unit.itemCode);

  if (missingPrices.length > 0) {
    return { ok: false, missingPrices };
  }

  const productIds = [...new Set(voucher.units.map((unit) => unit.productId))];

  await prisma.$transaction(async (tx) => {
    await tx.inventoryUnit.updateMany({
      where: { voucherId: voucher.id },
      data: { status: InventoryUnitStatus.Available },
    });

    await tx.entryVoucher.update({
      where: { id: voucher.id },
      data: {
        status: EntryVoucherStatus.Verified,
        verifiedAt: new Date(),
        verifiedByUserId: actor.id,
        verifiedByName: actor.name,
      },
    });

    for (const productId of productIds) {
      await syncProductStockInTx(tx, productId, {
        reason: "entry_voucher_verified",
        performedById: actor.id,
        performedByName: actor.name,
      });
    }

    await recordInventoryAuditInTx(tx, {
      entityType: "InventoryUnit",
      entityId: voucher.id,
      action: "VoucherVerified",
      newValue: {
        voucherCode: voucher.voucherCode,
        itemCount: voucher.units.length,
      },
      reason: "entry_voucher_verify",
      performedById: actor.id,
      performedByName: actor.name,
    });
  });

  const updated = await getEntryVoucherById(voucherId, organizationId);
  if (!updated) throw new InventoryError("Voucher not found.", 404);
  return { ok: true, voucher: updated };
};
