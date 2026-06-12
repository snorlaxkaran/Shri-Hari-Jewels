"use client";

import dynamic from "next/dynamic";
import PageHeader from "@/app/(components)/PageHeader";
import StatCard from "@/app/(components)/StatCard";
import StatusBadge from "@/app/(components)/StatusBadge";
import { dashboardStats, orders } from "@/lib/mock-data";
import { formatCompact, formatCurrency, formatDate } from "@/lib/format";
import { IndianRupee, ShoppingBag, Diamond, Users } from "lucide-react";

const DashboardCharts = dynamic(
  () => import("@/app/(components)/dashboard/DashboardCharts"),
  {
    loading: () => (
      <div className="h-72 rounded-xl border border-zinc-200 bg-white animate-pulse mb-6" />
    ),
    ssr: false,
  },
);

export default function DashboardPage() {
  const recentOrders = orders.slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your jewelry business"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Revenue"
          value={formatCompact(dashboardStats.totalRevenue)}
          change={dashboardStats.revenueChange}
          icon={<IndianRupee size={18} />}
        />
        <StatCard
          label="Total Orders"
          value={String(dashboardStats.totalOrders)}
          change={dashboardStats.ordersChange}
          icon={<ShoppingBag size={18} />}
        />
        <StatCard
          label="Inventory Items"
          value={String(dashboardStats.inventoryCount)}
          alert={`${dashboardStats.lowStockCount} low stock`}
          icon={<Diamond size={18} />}
        />
        <StatCard
          label="Active Customers"
          value={String(dashboardStats.activeCustomers)}
          change={dashboardStats.customersChange}
          icon={<Users size={18} />}
        />
      </div>

      <DashboardCharts />

      <div className="surface-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-900">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500">
                <th className="text-left px-5 py-3 font-medium">Order</th>
                <th className="text-left px-5 py-3 font-medium">Customer</th>
                <th className="text-left px-5 py-3 font-medium">Amount</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-zinc-100 text-zinc-900"
                >
                  <td className="px-5 py-3 font-medium">{order.orderNo}</td>
                  <td className="px-5 py-3">{order.customerName}</td>
                  <td className="px-5 py-3">{formatCurrency(order.total)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3">{formatDate(order.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
