"use client";

import dynamic from "next/dynamic";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useSales } from "@/lib/sales/sales-context";
import { formatCurrency } from "@/lib/format";

const SalesCharts = dynamic(
  () => import("@/app/(components)/sales-analytics/SalesCharts"),
  {
    loading: () => (
      <div className="h-80 rounded-xl border border-zinc-200 bg-white animate-pulse" />
    ),
    ssr: false,
  },
);

export default function SalesAnalyticsPage() {
  const { analytics, hydrated, loading, error } = useSales();

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  const monthly = analytics?.monthly ?? [];
  const totalRevenue = monthly.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = monthly.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue =
    totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  return (
    <div>
      <PageHeader
        title="Sales Analytics"
        subtitle="Performance insights from recorded sales"
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Revenue (6 mo)", value: formatCurrency(totalRevenue) },
          { label: "Units Sold (6 mo)", value: String(totalOrders) },
          { label: "Avg. Sale Value", value: formatCurrency(avgOrderValue) },
        ].map((stat) => (
          <div key={stat.label} className="surface-card p-5">
            <p className="text-xs text-zinc-400">{stat.label}</p>
            <p className="text-xl font-semibold mt-1 text-zinc-900 tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <SalesCharts
        salesData={monthly}
        categoryBreakdown={analytics?.categoryBreakdown ?? []}
      />
    </div>
  );
}
