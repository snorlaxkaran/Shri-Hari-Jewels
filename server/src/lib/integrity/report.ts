import { prisma } from "../db.js";
import { moneyToNumber, subtractMoney, toMoney } from "../money.js";
import { computeRunMetalWeightGrams } from "../production-runs/metal-inventory.js";

export type IntegrityMismatch = {
  category: string;
  entityType: string;
  entityId?: string;
  message: string;
  expected?: string;
  actual?: string;
};

const logMismatch = async (mismatch: IntegrityMismatch) => {
  console.warn(
    `[integrity-report] ${mismatch.category}: ${mismatch.message}` +
      (mismatch.expected ? ` (expected ${mismatch.expected}, actual ${mismatch.actual})` : ""),
  );

  await prisma.integrityMismatchLog.create({
    data: {
      category: mismatch.category,
      entityType: mismatch.entityType,
      entityId: mismatch.entityId ?? null,
      message: mismatch.message,
      expected: mismatch.expected ?? null,
      actual: mismatch.actual ?? null,
    },
  });
};

export const runIntegrityReport = async (): Promise<IntegrityMismatch[]> => {
  const mismatches: IntegrityMismatch[] = [];

  const products = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      stock: true,
      units: { select: { status: true } },
    },
  });

  for (const product of products) {
    const available = product.units.filter((u) => u.status === "Available").length;
    if (product.stock !== available) {
      const mismatch: IntegrityMismatch = {
        category: "product_stock",
        entityType: "Product",
        entityId: product.id,
        message: `Product ${product.sku} stock mismatch`,
        expected: String(available),
        actual: String(product.stock),
      };
      mismatches.push(mismatch);
      await logMismatch(mismatch);
    }
  }

  const completedRuns = await prisma.productionRun.findMany({
    where: { status: "Completed", metalInventoryDeducted: true },
    select: {
      branchId: true,
      setsOrdered: true,
      items: {
        select: {
          elementName: true,
          elementType: true,
          qtyPerSet: true,
          weightGramsPerPc: true,
          metalWeightGrams: true,
          metalLotId: true,
        },
      },
    },
  });

  const expectedMetalByBranch = new Map<string, number>();
  for (const run of completedRuns) {
    const used = computeRunMetalWeightGrams(run.items, run.setsOrdered);
    if (used <= 0) continue;
    expectedMetalByBranch.set(
      run.branchId,
      (expectedMetalByBranch.get(run.branchId) ?? 0) + used,
    );
  }

  const metalLots = await prisma.metalLot.findMany({
    select: { branchId: true, weightGrams: true },
  });
  const actualMetalByBranch = new Map<string, number>();
  for (const lot of metalLots) {
    actualMetalByBranch.set(
      lot.branchId,
      (actualMetalByBranch.get(lot.branchId) ?? 0) + lot.weightGrams,
    );
  }

  for (const [branchId, expectedUsed] of expectedMetalByBranch) {
    const actualTotal = actualMetalByBranch.get(branchId) ?? 0;
    if (expectedUsed > 0 && actualTotal < 0) {
      const mismatch: IntegrityMismatch = {
        category: "raw_metal",
        entityType: "Branch",
        entityId: branchId,
        message: "Negative metal lot weight detected after production consumption",
        expected: ">= 0",
        actual: String(actualTotal),
      };
      mismatches.push(mismatch);
      await logMismatch(mismatch);
    }
  }

  const sales = await prisma.sale.findMany({
    where: { paymentStatus: "Completed" },
    include: { invoiceItem: { include: { invoice: true } } },
  });

  for (const sale of sales) {
    if (!sale.invoiceItem?.invoice) {
      const mismatch: IntegrityMismatch = {
        category: "sale_invoice",
        entityType: "Sale",
        entityId: sale.id,
        message: `Completed sale ${sale.itemCode} has no invoice`,
      };
      mismatches.push(mismatch);
      await logMismatch(mismatch);
      continue;
    }

    const itemAmount = sale.invoiceItem
      ? moneyToNumber(sale.invoiceItem.amount)
      : 0;
    const invoiceTotal = sale.invoiceItem?.invoice
      ? moneyToNumber(sale.invoiceItem.invoice.total)
      : 0;
    const dealPrice = moneyToNumber(sale.dealPrice);
    if (Math.abs(itemAmount - dealPrice) > 0.009) {
      const mismatch: IntegrityMismatch = {
        category: "sale_invoice",
        entityType: "Sale",
        entityId: sale.id,
        message: `Sale ${sale.itemCode} deal price does not match invoice total`,
        expected: toMoney(dealPrice).toFixed(2),
        actual: toMoney(invoiceTotal).toFixed(2),
      };
      mismatches.push(mismatch);
      await logMismatch(mismatch);
    }

    const expectedTotal = moneyToNumber(
      subtractMoney(sale.listPrice, sale.discount),
    );
    if (Math.abs(expectedTotal - dealPrice) > 0.009) {
      const mismatch: IntegrityMismatch = {
        category: "sale_totals",
        entityType: "Sale",
        entityId: sale.id,
        message: `Sale ${sale.itemCode} deal price does not equal list minus discount`,
        expected: toMoney(expectedTotal).toFixed(2),
        actual: toMoney(dealPrice).toFixed(2),
      };
      mismatches.push(mismatch);
      await logMismatch(mismatch);
    }
  }

  console.log(
    `[integrity-report] Completed with ${mismatches.length} mismatch(es) logged`,
  );

  return mismatches;
};
