import type { Sale } from "@prisma/client";
import type {
  CategoryBreakdown,
  DashboardStats,
  SalesAnalytics,
  SalesDataPoint,
  TopProduct,
} from "../../types.js";
import { CATEGORY_COLORS } from "../inventory/categories.js";
import { getStockStatus } from "../inventory/status.js";
import { countPendingOrders } from "../orders/service.js";
import { getRawInventorySummary } from "../raw-inventory/metal-service.js";
import { prisma } from "../db.js";
import { toSale } from "./mappers.js";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const percentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const buildMonthlySeries = (sales: Sale[]): SalesDataPoint[] => {
  const now = new Date();
  const months: SalesDataPoint[] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const monthSales = sales.filter((s) => monthKey(s.soldAt) === key);
    months.push({
      month: MONTH_LABELS[d.getMonth()],
      revenue: monthSales.reduce((sum, s) => sum + s.dealPrice, 0),
      orders: monthSales.length,
    });
  }

  return months;
};

const buildCategoryBreakdown = (sales: Sale[]): CategoryBreakdown[] => {
  const totals = new Map<string, number>();
  for (const sale of sales) {
    totals.set(sale.category, (totals.get(sale.category) ?? 0) + sale.dealPrice);
  }

  const grandTotal = [...totals.values()].reduce((sum, v) => sum + v, 0);
  if (grandTotal === 0) return [];

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, revenue]) => ({
      category,
      value: Math.round((revenue / grandTotal) * 1000) / 10,
      color:
        CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] ?? "#a1a1aa",
    }));
};

const buildTopProducts = (sales: Sale[]): TopProduct[] => {
  const map = new Map<
    string,
    { productName: string; sku: string; unitsSold: number; revenue: number }
  >();

  for (const sale of sales) {
    const existing = map.get(sale.productId);
    if (existing) {
      existing.unitsSold += 1;
      existing.revenue += sale.dealPrice;
    } else {
      map.set(sale.productId, {
        productName: sale.productName,
        sku: sale.sku,
        unitsSold: 1,
        revenue: sale.dealPrice,
      });
    }
  }

  return [...map.entries()]
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
};

const uniqueCustomerIdsInRange = (
  sales: Sale[],
  start: Date,
  end: Date,
) =>
  new Set(
    sales
      .filter((s) => s.soldAt >= start && s.soldAt < end && s.customerId)
      .map((s) => s.customerId as string),
  ).size;

export const getSalesAnalytics = async (
  branchId?: string,
): Promise<SalesAnalytics> => {
  const [sales, products, customerCount, pendingOrders, rawSummary, activeWorkOrders] =
    await Promise.all([
    prisma.sale.findMany({
      where: { paymentStatus: "Completed", ...(branchId && { branchId }) },
      orderBy: { soldAt: "desc" },
    }),
    prisma.product.findMany({
      where: branchId ? { units: { some: { branchId } } } : undefined,
      select: {
        price: true,
        units: {
          where: branchId ? { branchId } : undefined,
          select: { status: true },
        },
      },
    }),
    prisma.customer.count(),
    countPendingOrders(branchId),
    getRawInventorySummary(),
    prisma.workOrder.count({
      where: {
        status: { in: ["Open", "In Production", "QC"] },
        ...(branchId && { branchId }),
      },
    }),
  ]);

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const todaySalesList = sales.filter(
    (s) => s.soldAt >= todayStart && s.soldAt < tomorrowStart,
  );
  const thisMonthSales = sales.filter(
    (s) => s.soldAt >= thisMonthStart && s.soldAt < nextMonthStart,
  );
  const lastMonthSales = sales.filter(
    (s) => s.soldAt >= lastMonthStart && s.soldAt < thisMonthStart,
  );

  const todaySales = todaySalesList.reduce((sum, s) => sum + s.dealPrice, 0);
  const monthlySales = thisMonthSales.reduce((sum, s) => sum + s.dealPrice, 0);
  const thisMonthRevenue = monthlySales;
  const lastMonthRevenue = lastMonthSales.reduce((sum, s) => sum + s.dealPrice, 0);

  const productStocks = products.map((product) => ({
    stock: product.units.filter((unit) => unit.status === "Available").length,
    price: product.price,
  }));
  const inventoryCount = productStocks.reduce((sum, p) => sum + p.stock, 0);
  const inventoryValue = productStocks.reduce((sum, p) => sum + p.stock * p.price, 0);
  const lowStockCount = products.filter(
    (p) =>
      getStockStatus(
        p.units.filter((unit) => unit.status === "Available").length,
      ) === "Low Stock",
  ).length;

  const uniqueSaleCustomers = new Set(
    sales.map((s) => s.customerId ?? s.customerPhone),
  ).size;

  const stats: DashboardStats = {
    totalRevenue: sales.reduce((sum, s) => sum + s.dealPrice, 0),
    revenueChange: percentChange(thisMonthRevenue, lastMonthRevenue),
    totalSales: sales.length,
    salesChange: percentChange(thisMonthSales.length, lastMonthSales.length),
    inventoryCount,
    inventoryValue,
    lowStockCount,
    activeCustomers: uniqueSaleCustomers,
    customersChange: percentChange(
      uniqueCustomerIdsInRange(sales, thisMonthStart, nextMonthStart),
      uniqueCustomerIdsInRange(sales, lastMonthStart, thisMonthStart),
    ),
    todaySales,
    monthlySales,
    pendingOrders,
    customerCount,
    goldGrams: rawSummary.goldGrams,
    silverGrams: rawSummary.silverGrams,
    diamondCarats: rawSummary.diamondCarats,
    activeWorkOrders,
  };

  return {
    stats,
    monthly: buildMonthlySeries(sales),
    categoryBreakdown: buildCategoryBreakdown(sales),
    recentSales: sales.slice(0, 10).map(toSale),
    topProducts: buildTopProducts(sales),
  };
};
