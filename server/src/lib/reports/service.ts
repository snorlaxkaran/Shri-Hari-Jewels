import { prisma } from "../db.js";
import { getBranchScope, organizationBranchFilter } from "../branches/access.js";
import { moneyToNumber, sumMoney, toMoney } from "../money.js";
import type { UserRole } from "../../types.js";

export const getGstReport = async (
  organizationId: string,
  from: Date,
  to: Date,
  branchId?: string,
) => {
  const sales = await prisma.sale.findMany({
    where: {
      ...organizationBranchFilter(organizationId, branchId),
      soldAt: { gte: from, lte: to },
      paymentStatus: "Completed",
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
) => {
  const products = await prisma.product.findMany({
    where: {
      organizationId,
      ...(branchId ? { branchId } : {}),
      stock: { gt: 0 },
    },
    select: {
      id: true,
      sku: true,
      name: true,
      category: true,
      metal: true,
      purity: true,
      stock: true,
      price: true,
      branchId: true,
    },
  });

  const byCategory = new Map<string, { units: number; value: number }>();
  let totalUnits = 0;
  let totalValue = 0;

  for (const p of products) {
    const value = moneyToNumber(p.price) * p.stock;
    totalUnits += p.stock;
    totalValue += value;
    const cat = byCategory.get(p.category) ?? { units: 0, value: 0 };
    cat.units += p.stock;
    cat.value += value;
    byCategory.set(p.category, cat);
  }

  return {
    totalUnits,
    totalValue,
    byCategory: [...byCategory.entries()].map(([category, data]) => ({
      category,
      ...data,
    })),
    products: products.map((p) => ({
      sku: p.sku,
      name: p.name,
      category: p.category,
      metal: p.metal,
      purity: p.purity,
      stock: p.stock,
      unitPrice: moneyToNumber(p.price),
      totalValue: moneyToNumber(p.price) * p.stock,
    })),
  };
};

export const getStaffPerformanceReport = async (
  organizationId: string,
  from: Date,
  to: Date,
  branchId?: string,
) => {
  const sales = await prisma.sale.findMany({
    where: {
      ...organizationBranchFilter(organizationId, branchId),
      soldAt: { gte: from, lte: to },
      paymentStatus: "Completed",
      createdById: { not: null },
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
) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - minDays);

  const units = await prisma.inventoryUnit.findMany({
    where: {
      ...organizationBranchFilter(organizationId, branchId),
      status: "Available",
      createdAt: { lte: cutoff },
    },
    include: {
      product: {
        select: {
          sku: true,
          name: true,
          category: true,
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
    price: moneyToNumber(u.product.price),
    daysInStock: Math.floor((now - u.createdAt.getTime()) / 86_400_000),
    createdAt: u.createdAt.toISOString(),
  }));
};

export const resolveReportBranchScope = async (
  userId: string,
  role: UserRole,
  organizationId: string,
): Promise<string | undefined> => getBranchScope(userId, role, organizationId);
