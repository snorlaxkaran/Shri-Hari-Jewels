import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export type OrganizationResetReport = Record<string, number>;

const DEFAULT_ORG_SLUG = "shree-hari-jewels";
const DEFAULT_ORG_ID = "org-shree-hari-jewels";

export const resolveOrganizationForReset = async (slugOrId?: string) => {
  const key = slugOrId ?? DEFAULT_ORG_SLUG;
  return prisma.organization.findFirst({
    where: {
      OR: [{ slug: key }, { id: key }],
    },
    select: { id: true, name: true, slug: true },
  });
};

/**
 * Deletes all operational ERP data for one organization.
 * Preserves: organization, branches, users, shop/storefront settings, market rates.
 */
export const resetOrganizationData = async (
  organizationId: string,
): Promise<OrganizationResetReport> => {
  const branches = await prisma.branch.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const branchIds = branches.map((branch) => branch.id);

  if (branchIds.length === 0) {
    throw new Error(`No branches found for organization ${organizationId}`);
  }

  const counts: OrganizationResetReport = {};

  const track = (label: string, result: { count: number }) => {
    if (result.count > 0) counts[label] = result.count;
    return result;
  };

  await prisma.$transaction(
    async (tx) => {
      track(
        "schemeInstallments",
        await tx.schemeInstallment.deleteMany({
          where: { enrollment: { scheme: { organizationId } } },
        }),
      );

      track(
        "schemeEnrollments",
        await tx.schemeEnrollment.deleteMany({
          where: { scheme: { organizationId } },
        }),
      );

      track(
        "savingsSchemes",
        await tx.savingsScheme.deleteMany({ where: { organizationId } }),
      );

      track(
        "invoiceItems",
        await tx.invoiceItem.deleteMany({
          where: { invoice: { branchId: { in: branchIds } } },
        }),
      );

      track(
        "invoices",
        await tx.invoice.deleteMany({
          where: { branchId: { in: branchIds } },
        }),
      );

      track("saleAuditLogs", await tx.saleAuditLog.deleteMany());

      track(
        "sales",
        await tx.sale.deleteMany({
          where: { branchId: { in: branchIds } },
        }),
      );

      track(
        "discountApprovals",
        await tx.discountApproval.deleteMany({ where: { organizationId } }),
      );

      track(
        "exchangeTransactions",
        await tx.exchangeTransaction.deleteMany({ where: { organizationId } }),
      );

      track(
        "eInvoiceRecords",
        await tx.eInvoiceRecord.deleteMany({ where: { organizationId } }),
      );

      track(
        "webOrderItems",
        await tx.webOrderItem.deleteMany({
          where: { webOrder: { organizationId } },
        }),
      );

      track(
        "webOrders",
        await tx.webOrder.deleteMany({ where: { organizationId } }),
      );

      const transfers = await tx.stockTransfer.findMany({
        where: {
          OR: [
            { fromBranchId: { in: branchIds } },
            { toBranchId: { in: branchIds } },
          ],
        },
        select: { id: true },
      });
      const transferIds = transfers.map((transfer) => transfer.id);

      if (transferIds.length > 0) {
        track(
          "stockTransferItems",
          await tx.stockTransferItem.deleteMany({
            where: { transferId: { in: transferIds } },
          }),
        );
        track(
          "stockTransfers",
          await tx.stockTransfer.deleteMany({
            where: { id: { in: transferIds } },
          }),
        );
      }

      track(
        "hallmarkBatchItems",
        await tx.hallmarkBatchItem.deleteMany({
          where: { batch: { organizationId } },
        }),
      );

      track(
        "hallmarkBatches",
        await tx.hallmarkBatch.deleteMany({ where: { organizationId } }),
      );

      track(
        "productionRunMetalIssues",
        await tx.productionRunMetalIssue.deleteMany({
          where: { branchId: { in: branchIds } },
        }),
      );

      track(
        "productionRunStoneIssues",
        await tx.productionRunStoneIssue.deleteMany({
          where: { branchId: { in: branchIds } },
        }),
      );

      track(
        "productionRunStageLogs",
        await tx.productionRunStageLog.deleteMany({
          where: { productionRun: { organizationId } },
        }),
      );

      track(
        "productionRunItems",
        await tx.productionRunItem.deleteMany({
          where: { productionRun: { organizationId } },
        }),
      );

      await tx.product.updateMany({
        where: { organizationId },
        data: { productionRunId: null },
      });

      track(
        "productionRuns",
        await tx.productionRun.deleteMany({ where: { organizationId } }),
      );

      track(
        "workOrders",
        await tx.workOrder.deleteMany({
          where: { branchId: { in: branchIds } },
        }),
      );

      track(
        "orders",
        await tx.order.deleteMany({
          where: { branchId: { in: branchIds } },
        }),
      );

      track(
        "inventoryUnits",
        await tx.inventoryUnit.deleteMany({ where: { organizationId } }),
      );

      track(
        "entryVouchers",
        await tx.entryVoucher.deleteMany({ where: { organizationId } }),
      );

      track(
        "storefrontCollectionProducts",
        await tx.storefrontCollectionProduct.deleteMany({
          where: { product: { organizationId } },
        }),
      );

      track(
        "productImages",
        await tx.productImage.deleteMany({
          where: { product: { organizationId } },
        }),
      );

      track(
        "products",
        await tx.product.deleteMany({ where: { organizationId } }),
      );

      track(
        "designElements",
        await tx.designElement.deleteMany({
          where: { design: { organizationId } },
        }),
      );

      track(
        "designs",
        await tx.design.deleteMany({ where: { organizationId } }),
      );

      track(
        "motifStones",
        await tx.motifStone.deleteMany({
          where: { motif: { branchId: { in: branchIds } } },
        }),
      );

      track(
        "motifs",
        await tx.motif.deleteMany({
          where: { branchId: { in: branchIds } },
        }),
      );

      track(
        "stoneStockMovements",
        await tx.stoneStockMovement.deleteMany({
          where: { branchId: { in: branchIds } },
        }),
      );

      track(
        "stoneStocks",
        await tx.stoneStock.deleteMany({
          where: { branchId: { in: branchIds } },
        }),
      );

      track(
        "certifiedStoneLots",
        await tx.certifiedStoneLot.deleteMany({
          where: { branchId: { in: branchIds } },
        }),
      );

      track(
        "metalLots",
        await tx.metalLot.deleteMany({
          where: { branchId: { in: branchIds } },
        }),
      );

      track(
        "stoneTypes",
        await tx.stoneType.deleteMany({ where: { organizationId } }),
      );

      track(
        "repairPhotos",
        await tx.repairPhoto.deleteMany({
          where: { repairOrder: { organizationId } },
        }),
      );

      track(
        "repairStatusLogs",
        await tx.repairStatusLog.deleteMany({
          where: { repairOrder: { organizationId } },
        }),
      );

      track(
        "repairOrders",
        await tx.repairOrder.deleteMany({ where: { organizationId } }),
      );

      track(
        "followUps",
        await tx.followUp.deleteMany({
          where: { lead: { organizationId } },
        }),
      );

      track(
        "appointments",
        await tx.appointment.deleteMany({
          where: { branchId: { in: branchIds } },
        }),
      );

      track(
        "leads",
        await tx.lead.deleteMany({ where: { organizationId } }),
      );

      track(
        "customerDepartmentContacts",
        await tx.customerDepartmentContact.deleteMany({
          where: { customer: { organizationId } },
        }),
      );

      track(
        "customerBranches",
        await tx.customerBranch.deleteMany({
          where: { customer: { organizationId } },
        }),
      );

      track(
        "customers",
        await tx.customer.deleteMany({ where: { organizationId } }),
      );

      track(
        "purchaseBills",
        await tx.purchaseBill.deleteMany({ where: { organizationId } }),
      );

      track(
        "vendors",
        await tx.vendor.deleteMany({ where: { organizationId } }),
      );

      track(
        "storefrontCollections",
        await tx.storefrontCollection.deleteMany({ where: { organizationId } }),
      );

      track(
        "tallyExportLogs",
        await tx.tallyExportLog.deleteMany({ where: { organizationId } }),
      );

      track(
        "karigarSettlements",
        await tx.karigarSettlement.deleteMany({ where: { organizationId } }),
      );

      track("inventoryAuditLogs", await tx.inventoryAuditLog.deleteMany());
      track("rawStockAuditLogs", await tx.rawStockAuditLog.deleteMany());
      track("catalogAuditLogs", await tx.catalogAuditLog.deleteMany());
      track("integrityMismatchLogs", await tx.integrityMismatchLog.deleteMany());

      track(
        "auditLogs",
        await tx.auditLog.deleteMany({ where: { organizationId } }),
      );

      track(
        "notifications",
        await tx.notification.deleteMany({
          where: {
            OR: [{ organizationId }, { user: { organizationId } }],
          },
        }),
      );
    },
    { timeout: 120_000 },
  );

  return counts;
};

export const SHREE_HARI_ORG = {
  id: DEFAULT_ORG_ID,
  slug: DEFAULT_ORG_SLUG,
} as const;
