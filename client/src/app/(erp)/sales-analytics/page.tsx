"use client";

import dynamic from "next/dynamic";
import PageHeader from "@/app/(components)/PageHeader";
import { salesData } from "@/lib/mock-data";
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
  const totalRevenue = salesData.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = salesData.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = Math.round(totalRevenue / totalOrders);

  return (
    <div>
      <PageHeader
        title="Sales Analytics"
        subtitle="Performance insights for the last 6 months"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Revenue", value: formatCurrency(totalRevenue) },
          { label: "Total Orders", value: String(totalOrders) },
          { label: "Avg. Order Value", value: formatCurrency(avgOrderValue) },
        ].map((stat) => (
          <div key={stat.label} className="surface-card p-5">
            <p className="text-xs text-zinc-400">{stat.label}</p>
            <p className="text-xl font-semibold mt-1 text-zinc-900 tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <SalesCharts />
    </div>
  );
}
