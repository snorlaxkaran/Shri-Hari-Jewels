import { SalePaymentStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { createInvoiceForCart } from "./service.js";

export type BackfillSaleInvoicesReport = {
  invoiceGroupsCreated: number;
  salesLinked: number;
  skippedWholesale: number;
  failed: number;
  errors: string[];
};

/**
 * Creates retail GST invoices for completed direct/cart sales missing InvoiceItem rows.
 * Wholesale transfer sales use StockTransfer.invoiceNo — skipped intentionally.
 */
export const backfillMissingSaleInvoices = async (options?: {
  dryRun?: boolean;
  organizationId?: string;
}): Promise<BackfillSaleInvoicesReport> => {
  const sales = await prisma.sale.findMany({
    where: {
      paymentStatus: SalePaymentStatus.Completed,
      invoiceItem: null,
      saleSource: { not: "WholesaleTransfer" },
      ...(options?.organizationId
        ? { branch: { organizationId: options.organizationId } }
        : {}),
    },
    include: { branch: { select: { organizationId: true } } },
    orderBy: [{ soldAt: "asc" }, { itemCode: "asc" }],
  });

  const skippedWholesale = await prisma.sale.count({
    where: {
      paymentStatus: SalePaymentStatus.Completed,
      invoiceItem: null,
      saleSource: "WholesaleTransfer",
      ...(options?.organizationId
        ? { branch: { organizationId: options.organizationId } }
        : {}),
    },
  });

  const groups = new Map<string, typeof sales>();
  for (const sale of sales) {
    const key = sale.cartGroupId ?? sale.id;
    const list = groups.get(key) ?? [];
    list.push(sale);
    groups.set(key, list);
  }

  let invoiceGroupsCreated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const [, groupSales] of groups) {
    const orgId = groupSales[0].branch.organizationId;
    const label = groupSales.map((s) => s.itemCode).join(", ");

    if (options?.dryRun) {
      invoiceGroupsCreated += 1;
      continue;
    }

    try {
      await prisma.$transaction(
        async (tx) => {
          await createInvoiceForCart(groupSales, orgId, tx);
        },
        { timeout: 30_000 },
      );
      invoiceGroupsCreated += 1;
    } catch (error) {
      failed += 1;
      const message =
        error instanceof Error ? error.message : "Unknown invoice backfill error";
      errors.push(`${label}: ${message}`);
    }
  }

  return {
    invoiceGroupsCreated,
    salesLinked: sales.length,
    skippedWholesale,
    failed,
    errors,
  };
};
