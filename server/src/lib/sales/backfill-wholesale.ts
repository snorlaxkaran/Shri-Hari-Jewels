import {
  InventoryUnitStatus,
  SalePaymentStatus,
} from "@prisma/client";
import { getUserBranch } from "../branches/access.js";
import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";

export type BackfillMissingWholesaleSalesReport = {
  salesCreated: number;
  skipped: number;
  failed: number;
  itemCodes: string[];
};

/**
 * Sold units from Wholesale GST Invoice transfers should always have a Sale row
 * (analytics/revenue reads from Sale, not unit status). Creates any that are missing.
 */
export const backfillMissingWholesaleSales = async (options?: {
  dryRun?: boolean;
  organizationId?: string;
}): Promise<BackfillMissingWholesaleSalesReport> => {
  const soldWithoutSale = await prisma.inventoryUnit.findMany({
    where: {
      status: InventoryUnitStatus.Sold,
      sale: null,
      ...(options?.organizationId
        ? { organizationId: options.organizationId }
        : {}),
    },
    include: { product: true },
  });

  let salesCreated = 0;
  let skipped = 0;
  let failed = 0;
  const itemCodes: string[] = [];

  for (const unit of soldWithoutSale) {
    const transferItems = await prisma.stockTransferItem.findMany({
      where: {
        itemCode: unit.itemCode,
        transfer: { documentType: "Wholesale GST Invoice" },
      },
      include: {
        transfer: {
          include: {
            customer: { select: { name: true, mobile: true } },
          },
        },
      },
    });

    const transferItem = transferItems.sort(
      (a, b) =>
        b.transfer.transferDate.getTime() - a.transfer.transferDate.getTime(),
    )[0];

    if (!transferItem) {
      skipped += 1;
      continue;
    }

    const transfer = transferItem.transfer;
    const createdById = transfer.createdById;
    if (!createdById) {
      skipped += 1;
      continue;
    }

    try {
      const sellingBranchId = await getUserBranch(
        createdById,
        unit.organizationId,
      );
      const listPrice = moneyToNumber(transferItem.price);

      if (options?.dryRun) {
        itemCodes.push(unit.itemCode);
        salesCreated += 1;
        continue;
      }

      await prisma.sale.create({
        data: {
          branchId: sellingBranchId,
          unitId: unit.id,
          itemCode: unit.itemCode,
          productId: unit.productId,
          productName: unit.product.name,
          sku: unit.product.sku,
          category: unit.product.category,
          listPrice,
          discount: 0,
          dealPrice: listPrice,
          paymentMode: "Transfer",
          paymentStatus: SalePaymentStatus.Completed,
          customerPhone: transfer.customer?.mobile ?? "",
          customerName: transfer.customer?.name,
          customerId: transfer.customerId,
          soldAt: transfer.transferDate,
          saleSource: "WholesaleTransfer",
          stockTransferId: transfer.id,
        },
      });

      itemCodes.push(unit.itemCode);
      salesCreated += 1;
    } catch {
      failed += 1;
    }
  }

  return { salesCreated, skipped, failed, itemCodes };
};
