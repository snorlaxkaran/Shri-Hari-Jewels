"use client";

import dynamic from "next/dynamic";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatCard from "@/app/(components)/StatCard";
import LiveSalesSummary from "@/app/(components)/dashboard/LiveSalesSummary";
import { useSales } from "@/lib/sales/sales-context";
import { formatCompact, formatCurrency, formatDate } from "@/lib/format";

const DashboardCharts = dynamic(
  () => import("@/app/(components)/dashboard/DashboardCharts"),
  {
    loading: () => (
      <div className="h-72 surface-card animate-pulse mb-6" />
    ),
    ssr: false,
  },
);

export default function DashboardPage() {
  const { analytics, hydrated, loading, error } = useSales();

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  const stats = analytics?.stats;
  const recentSales = analytics?.recentSales ?? [];
  const topProducts = analytics?.topProducts ?? [];

  return (
    <div className="page-content">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your jewelry business"
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <LiveSalesSummary />

      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[10px]"
        style={{ marginBottom: 10 }}
      >
        <StatCard
          label="Today's Sales"
          value={formatCurrency(stats?.todaySales ?? 0)}
        />
        <StatCard
          label="Monthly Sales"
          value={formatCurrency(stats?.monthlySales ?? 0)}
          change={stats?.revenueChange}
        />
        <StatCard
          label="Total Revenue"
          value={formatCompact(stats?.totalRevenue ?? 0)}
        />
        <StatCard
          label="Total Sales"
          value={String(stats?.totalSales ?? 0)}
          change={stats?.salesChange}
        />
        <StatCard
          label="Gold Stock"
          value={`${(stats?.goldGrams ?? 0).toFixed(2)} g`}
        />
        <StatCard
          label="Silver Stock"
          value={`${(stats?.silverGrams ?? 0).toFixed(2)} g`}
        />
        <StatCard
          label="Diamond Stock"
          value={`${(stats?.diamondCarats ?? 0).toFixed(2)} ct`}
        />
        <StatCard
          label="Stone Stock Value"
          value={formatCurrency(stats?.stoneStockValue ?? 0)}
        />
        <StatCard
          label="Manufacturing Jobs"
          value={String(stats?.activeWorkOrders ?? 0)}
        />
        <StatCard
          label="Inventory Units"
          value={String(stats?.inventoryCount ?? 0)}
          alert={
            stats?.lowStockCount
              ? `${stats.lowStockCount} low stock`
              : undefined
          }
        />
        <StatCard
          label="Inventory Value (live rates)"
          value={formatCompact(stats?.inventoryValue ?? 0)}
        />
        <StatCard
          label="Pending Orders"
          value={String(stats?.pendingOrders ?? 0)}
        />
        <StatCard
          label="Customers"
          value={String(stats?.customerCount ?? 0)}
          change={stats?.customersChange}
        />
      </div>

      <DashboardCharts
        salesData={analytics?.monthly ?? []}
        categoryBreakdown={analytics?.categoryBreakdown ?? []}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="surface-card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200">
            <h2 className="text-sm font-semibold text-zinc-900">Top Selling Products</h2>
          </div>
          {topProducts.length === 0 ? (
            <p className="px-5 py-8 text-sm text-zinc-400 text-center">No sales data yet.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {topProducts.map((p, i) => (
                <div key={p.productId} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {i + 1}. {p.productName}
                    </p>
                    <p className="text-xs text-zinc-400 font-mono">{p.sku}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-semibold text-zinc-900">{formatCurrency(p.revenue)}</p>
                    <p className="text-zinc-400">{p.unitsSold} sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200">
            <h2 className="text-sm font-semibold text-zinc-900">Recent Sales</h2>
          </div>
          {recentSales.length === 0 ? (
            <p className="px-5 py-8 text-sm text-zinc-400 text-center">
              No sales recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Customer</th>
                    <th>Deal</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.slice(0, 5).map((sale) => (
                    <tr key={sale.id}>
                      <td className="td-code">{sale.itemCode}</td>
                      <td className="td-muted">{sale.customerName ?? sale.customerPhone}</td>
                      <td className="td-num">{formatCurrency(sale.dealPrice)}</td>
                      <td className="td-muted">{formatDate(sale.soldAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
