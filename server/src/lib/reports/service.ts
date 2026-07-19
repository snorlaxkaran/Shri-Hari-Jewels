import { InventoryUnitStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { getBranchScope, organizationBranchFilter } from "../branches/access.js";
import {
  fetchAvailableUnitsForValuation,
  resolveAvailableUnitValue,
  sumAvailableUnitValues,
} from "../inventory/stock-valuation.js";
import { getCurrentMarketRates } from "../market-rates/service.js";
import { resolveUnitDisplayPrice } from "../inventory/unit-pricing.js";
import { moneyToNumber, sumMoney } from "../money.js";
import type { UserRole } from "../../types.js";
import { toApiDesignBuilderStage } from "../designs/builder-stages.js";

export type ReportQueryFilters = {
  branchId?: string;
  category?: string;
  department?: string;
  customerId?: string;
  groupBySku?: boolean;
  minDays?: number;
};

const saleFilterExtras = async (
  organizationId: string,
  filters: ReportQueryFilters,
) => {
  const extras: Record<string, unknown> = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
  };

  if (filters.department) {
    const products = await prisma.product.findMany({
      where: { organizationId, metal: filters.department },
      select: { id: true },
    });
    extras.productId = { in: products.map((p) => p.id) };
  }

  return extras;
};

export const getGstReport = async (
  organizationId: string,
  from: Date,
  to: Date,
  branchId?: string,
  filters: ReportQueryFilters = {},
) => {
  const saleExtras = await saleFilterExtras(organizationId, filters);
  const sales = await prisma.sale.findMany({
    where: {
      ...organizationBranchFilter(organizationId, branchId ?? filters.branchId),
      soldAt: { gte: from, lte: to },
      paymentStatus: "Completed",
      ...saleExtras,
    },
    select: {
      id: true,
      itemCode: true,
      productName: true,
      listPrice: true,
      discount: true,
      dealPrice: true,
      soldAt: true,
      customerName: true,
    },
    orderBy: { soldAt: "asc" },
  });

  const taxableValue = sumMoney(sales.map((s) => s.dealPrice));
  const totalDiscount = sumMoney(sales.map((s) => s.discount));

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    saleCount: sales.length,
    taxableValue: moneyToNumber(taxableValue),
    totalDiscount: moneyToNumber(totalDiscount),
    lines: sales.map((s) => ({
      id: s.id,
      itemCode: s.itemCode,
      productName: s.productName,
      customerName: s.customerName ?? "",
      listPrice: moneyToNumber(s.listPrice),
      discount: moneyToNumber(s.discount),
      taxableValue: moneyToNumber(s.dealPrice),
      soldAt: s.soldAt.toISOString(),
    })),
  };
};

export const getStockValuationReport = async (
  organizationId: string,
  branchId?: string,
  filters: ReportQueryFilters = {},
) => {
  const scopedBranch = branchId ?? filters.branchId;
  const { units, marketRates } = await fetchAvailableUnitsForValuation(
    organizationId,
    scopedBranch,
    {
      category: filters.category,
      department: filters.department,
    },
  );

  const byProduct = new Map<
    string,
    {
      sku: string;
      name: string;
      category: string;
      metal: string;
      purity: string;
      stock: number;
      unitPrice: number;
      totalValue: number;
    }
  >();

  for (const unit of units) {
    const unitValue = resolveAvailableUnitValue(unit, marketRates);
    const row = byProduct.get(unit.product.sku) ?? {
      sku: unit.product.sku,
      name: unit.product.name,
      category: unit.product.category,
      metal: unit.product.metal,
      purity: unit.product.purity,
      stock: 0,
      unitPrice: unitValue,
      totalValue: 0,
    };
    row.stock += 1;
    row.totalValue += unitValue;
    row.unitPrice = unitValue;
    byProduct.set(unit.product.sku, row);
  }

  const products = [...byProduct.values()].sort((a, b) =>
    a.sku.localeCompare(b.sku),
  );

  const byCategory = new Map<string, { units: number; value: number }>();
  let totalUnits = 0;
  let totalValue = 0;

  for (const product of products) {
    totalUnits += product.stock;
    totalValue += product.totalValue;
    const cat = byCategory.get(product.category) ?? { units: 0, value: 0 };
    cat.units += product.stock;
    cat.value += product.totalValue;
    byCategory.set(product.category, cat);
  }

  return {
    totalUnits,
    totalValue,
    byCategory: [...byCategory.entries()].map(([category, data]) => ({
      category,
      ...data,
    })),
    products,
  };
};

export const getStaffPerformanceReport = async (
  organizationId: string,
  from: Date,
  to: Date,
  branchId?: string,
  filters: ReportQueryFilters = {},
) => {
  const saleExtras = await saleFilterExtras(organizationId, filters);
  const sales = await prisma.sale.findMany({
    where: {
      ...organizationBranchFilter(organizationId, branchId ?? filters.branchId),
      soldAt: { gte: from, lte: to },
      paymentStatus: "Completed",
      createdById: { not: null },
      ...saleExtras,
    },
    select: {
      createdById: true,
      createdByName: true,
      dealPrice: true,
    },
  });

  const byStaff = new Map<
    string,
    { name: string; salesCount: number; revenue: number }
  >();

  for (const s of sales) {
    const id = s.createdById!;
    const row = byStaff.get(id) ?? {
      name: s.createdByName ?? "Unknown",
      salesCount: 0,
      revenue: 0,
    };
    row.salesCount += 1;
    row.revenue += moneyToNumber(s.dealPrice);
    byStaff.set(id, row);
  }

  return [...byStaff.entries()]
    .map(([staffId, data]) => ({ staffId, ...data }))
    .sort((a, b) => b.revenue - a.revenue);
};

export const getAgeingStockReport = async (
  organizationId: string,
  minDays = 90,
  branchId?: string,
  filters: ReportQueryFilters = {},
) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - minDays);

  const marketRates = await getCurrentMarketRates(organizationId);

  const units = await prisma.inventoryUnit.findMany({
    where: {
      ...organizationBranchFilter(organizationId, branchId ?? filters.branchId),
      status: "Available",
      createdAt: { lte: cutoff },
      ...(filters.category || filters.department
        ? {
            product: {
              ...(filters.category ? { category: filters.category } : {}),
              ...(filters.department ? { metal: filters.department } : {}),
            },
          }
        : {}),
    },
    include: {
      product: {
        select: {
          sku: true,
          name: true,
          category: true,
          metal: true,
          purity: true,
          weightGrams: true,
          price: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const now = Date.now();
  return units.map((u) => ({
    itemCode: u.itemCode,
    sku: u.product.sku,
    productName: u.product.name,
    category: u.product.category,
    price: resolveUnitDisplayPrice(u, u.product, marketRates).price,
    daysInStock: Math.floor((now - u.createdAt.getTime()) / 86_400_000),
    createdAt: u.createdAt.toISOString(),
  }));
};

export const resolveReportBranchScope = async (
  userId: string,
  role: UserRole,
  organizationId: string,
): Promise<string | undefined> => getBranchScope(userId, role, organizationId);

export const getCategoryReport = async (
  organizationId: string,
  from: Date,
  to: Date,
  branchId?: string,
  filters: ReportQueryFilters = {},
) => {
  const scopedBranch = branchId ?? filters.branchId;
  const saleExtras = await saleFilterExtras(organizationId, filters);

  const sales = await prisma.sale.findMany({
    where: {
      ...organizationBranchFilter(organizationId, scopedBranch),
      soldAt: { gte: from, lte: to },
      paymentStatus: "Completed",
      ...saleExtras,
    },
    select: { category: true, dealPrice: true, sku: true },
  });

  const { units: valuationUnits, marketRates } =
    await fetchAvailableUnitsForValuation(organizationId, scopedBranch, {
      department: filters.department,
    });

  type Row = { category: string; salesCount: number; revenue: number; stockUnits: number; stockValue: number };
  const rows = new Map<string, Row>();

  const ensure = (category: string) => {
    if (!rows.has(category)) {
      rows.set(category, { category, salesCount: 0, revenue: 0, stockUnits: 0, stockValue: 0 });
    }
    return rows.get(category)!;
  };

  for (const s of sales) {
    if (filters.category && s.category !== filters.category) continue;
    const row = ensure(s.category);
    row.salesCount += 1;
    row.revenue += moneyToNumber(s.dealPrice);
  }

  for (const unit of valuationUnits) {
    if (filters.category && unit.product.category !== filters.category) continue;
    const row = ensure(unit.product.category);
    row.stockUnits += 1;
    row.stockValue += resolveAvailableUnitValue(unit, marketRates);
  }

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    rows: [...rows.values()].sort((a, b) => b.revenue - a.revenue),
  };
};

export const getDepartmentReport = async (
  organizationId: string,
  from: Date,
  to: Date,
  branchId?: string,
  filters: ReportQueryFilters = {},
) => {
  const scopedBranch = branchId ?? filters.branchId;
  const saleExtras = await saleFilterExtras(organizationId, filters);

  const sales = await prisma.sale.findMany({
    where: {
      ...organizationBranchFilter(organizationId, scopedBranch),
      soldAt: { gte: from, lte: to },
      paymentStatus: "Completed",
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...saleExtras,
    },
    select: {
      dealPrice: true,
      productId: true,
      sku: true,
    },
  });

  const productIds = [...new Set(sales.map((s) => s.productId))];
  const productsById = new Map(
    (
      await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, metal: true },
      })
    ).map((p) => [p.id, p.metal]),
  );

  const { units: valuationUnits, marketRates } =
    await fetchAvailableUnitsForValuation(organizationId, scopedBranch, {
      category: filters.category,
      department: filters.department,
    });

  type Row = { department: string; salesCount: number; revenue: number; stockUnits: number; stockValue: number };
  const rows = new Map<string, Row>();

  const ensure = (department: string) => {
    if (!rows.has(department)) {
      rows.set(department, { department, salesCount: 0, revenue: 0, stockUnits: 0, stockValue: 0 });
    }
    return rows.get(department)!;
  };

  for (const s of sales) {
    const dept = productsById.get(s.productId) ?? "Unknown";
    const row = ensure(dept);
    row.salesCount += 1;
    row.revenue += moneyToNumber(s.dealPrice);
  }

  for (const unit of valuationUnits) {
    const row = ensure(unit.product.metal);
    row.stockUnits += 1;
    row.stockValue += resolveAvailableUnitValue(unit, marketRates);
  }

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    rows: [...rows.values()].sort((a, b) => b.revenue - a.revenue),
  };
};

export const getCustomerReport = async (
  organizationId: string,
  from: Date,
  to: Date,
  branchId?: string,
  filters: ReportQueryFilters = {},
) => {
  const saleExtras = await saleFilterExtras(organizationId, filters);
  const sales = await prisma.sale.findMany({
    where: {
      ...organizationBranchFilter(organizationId, branchId ?? filters.branchId),
      soldAt: { gte: from, lte: to },
      paymentStatus: "Completed",
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...saleExtras,
    },
    select: {
      customerId: true,
      customerName: true,
      customerPhone: true,
      dealPrice: true,
      soldAt: true,
    },
    orderBy: { soldAt: "desc" },
  });

  type Row = {
    customerId: string | null;
    customerName: string;
    customerPhone: string;
    purchaseCount: number;
    totalSpend: number;
    lastVisit: string;
  };

  const rows = new Map<string, Row>();

  for (const s of sales) {
    const key = s.customerId ?? s.customerPhone;
    const row = rows.get(key) ?? {
      customerId: s.customerId,
      customerName: s.customerName ?? s.customerPhone,
      customerPhone: s.customerPhone,
      purchaseCount: 0,
      totalSpend: 0,
      lastVisit: s.soldAt.toISOString(),
    };
    row.purchaseCount += 1;
    row.totalSpend += moneyToNumber(s.dealPrice);
    if (new Date(s.soldAt) > new Date(row.lastVisit)) {
      row.lastVisit = s.soldAt.toISOString();
    }
    rows.set(key, row);
  }

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    customers: [...rows.values()].sort((a, b) => b.totalSpend - a.totalSpend),
  };
};

export const getLocationWiseReport = async (
  organizationId: string,
  from: Date,
  to: Date,
  filters: ReportQueryFilters = {},
) => {
  const saleExtras = await saleFilterExtras(organizationId, filters);

  const branches = await prisma.branch.findMany({
    where: { organizationId, active: true },
    select: { id: true, name: true, address: true },
    orderBy: { name: "asc" },
  });

  const sales = await prisma.sale.findMany({
    where: {
      branch: { organizationId },
      soldAt: { gte: from, lte: to },
      paymentStatus: "Completed",
      ...saleExtras,
    },
    select: { branchId: true, dealPrice: true },
  });

  const marketRates = await getCurrentMarketRates(organizationId);

  const units = await prisma.inventoryUnit.findMany({
    where: {
      branch: { organizationId },
      status: "Available",
      ...(filters.category || filters.department
        ? {
            product: {
              ...(filters.category ? { category: filters.category } : {}),
              ...(filters.department ? { metal: filters.department } : {}),
            },
          }
        : {}),
    },
    select: {
      branchId: true,
      listPrice: true,
      status: true,
      product: {
        select: {
          metal: true,
          purity: true,
          weightGrams: true,
          price: true,
        },
      },
      branch: { select: { name: true } },
    },
  });

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    branches: branches.map((branch) => {
      const branchSales = sales.filter((s) => s.branchId === branch.id);
      const branchUnits = units.filter((u) => u.branchId === branch.id);
      return {
        branchId: branch.id,
        branchName: branch.name,
        address: branch.address,
        salesCount: branchSales.length,
        revenue: branchSales.reduce((sum, s) => sum + moneyToNumber(s.dealPrice), 0),
        stockUnits: branchUnits.length,
        stockValue: sumAvailableUnitValues(branchUnits, marketRates),
      };
    }),
  };
};

export const getCadReport = async (
  organizationId: string,
  branchId?: string,
  filters: ReportQueryFilters = {},
) => {
  const designs = await prisma.design.findMany({
    where: {
      organizationId,
      ...(branchId ?? filters.branchId ? { branchId: branchId ?? filters.branchId } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.department ? { metal: filters.department } : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      builderStage: true,
      cadReady: true,
      createdAt: true,
      updatedAt: true,
      cadCompletedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const now = Date.now();
  const byStage = new Map<string, { stage: string; count: number; pendingCad: number }>();

  const items = designs.map((d) => {
    const stage = toApiDesignBuilderStage(d.builderStage);
    const stageRow = byStage.get(stage) ?? { stage, count: 0, pendingCad: 0 };
    stageRow.count += 1;
    if (stage === "CAD" && !d.cadReady) stageRow.pendingCad += 1;
    byStage.set(stage, stageRow);

    const referenceTime = d.cadCompletedAt ?? d.updatedAt;
    const daysInStage = Math.floor((now - referenceTime.getTime()) / 86_400_000);

    return {
      code: d.code,
      name: d.name ?? "",
      stage,
      cadReady: d.cadReady,
      daysInStage,
      updatedAt: d.updatedAt.toISOString(),
    };
  });

  return {
    summary: [...byStage.values()],
    pendingCadCount: items.filter((i) => i.stage === "CAD" && !i.cadReady).length,
    designs: items,
  };
};

export const getStockSnapshotReport = async (
  organizationId: string,
  branchId?: string,
  filters: ReportQueryFilters = {},
) => {
  const scopedBranch = branchId ?? filters.branchId;
  const { units, marketRates } = await fetchAvailableUnitsForValuation(
    organizationId,
    scopedBranch,
    {
      category: filters.category,
      department: filters.department,
    },
  );

  if (filters.groupBySku) {
    const bySku = new Map<
      string,
      {
        sku: string;
        name: string;
        category: string;
        metal: string;
        branchName: string;
        stock: number;
        unitPrice: number;
        totalValue: number;
        status: string;
      }
    >();

    for (const unit of units) {
      const unitValue = resolveAvailableUnitValue(unit, marketRates);
      const key = `${unit.branchId}:${unit.product.sku}`;
      const row = bySku.get(key) ?? {
        sku: unit.product.sku,
        name: unit.product.name,
        category: unit.product.category,
        metal: unit.product.metal,
        branchName: unit.branch.name,
        stock: 0,
        unitPrice: unitValue,
        totalValue: 0,
        status: "In Stock",
      };
      row.stock += 1;
      row.totalValue += unitValue;
      row.unitPrice = unitValue;
      bySku.set(key, row);
    }

    const items = [...bySku.values()].sort((a, b) =>
      a.sku.localeCompare(b.sku),
    );

    return {
      groupBySku: true,
      items,
      totalUnits: items.reduce((sum, item) => sum + item.stock, 0),
      totalValue: items.reduce((sum, item) => sum + item.totalValue, 0),
    };
  }

  const detailedUnits = await prisma.inventoryUnit.findMany({
    where: {
      ...organizationBranchFilter(organizationId, scopedBranch),
      status: InventoryUnitStatus.Available,
      ...(filters.category || filters.department
        ? {
            product: {
              ...(filters.category ? { category: filters.category } : {}),
              ...(filters.department ? { metal: filters.department } : {}),
            },
          }
        : {}),
    },
    include: {
      product: {
        select: {
          sku: true,
          name: true,
          category: true,
          metal: true,
          purity: true,
          weightGrams: true,
          price: true,
          status: true,
        },
      },
      branch: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    groupBySku: false,
    items: detailedUnits.map((u) => ({
      itemCode: u.itemCode,
      sku: u.product.sku,
      name: u.product.name,
      category: u.product.category,
      metal: u.product.metal,
      branchName: u.branch.name,
      unitPrice: resolveUnitDisplayPrice(u, u.product, marketRates).price,
      status: u.status,
    })),
    totalUnits: detailedUnits.length,
    totalValue: sumAvailableUnitValues(detailedUnits, marketRates),
  };
};
