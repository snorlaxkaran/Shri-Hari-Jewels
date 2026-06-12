"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { CategoryBreakdown, SalesDataPoint } from "@/lib/types";
import { formatChartAxis, formatCurrency } from "@/lib/format";

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e4e4e7",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.06)",
};

type DashboardChartsProps = {
  salesData: SalesDataPoint[];
  categoryBreakdown: CategoryBreakdown[];
};

export default function DashboardCharts({
  salesData,
  categoryBreakdown,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div className="lg:col-span-2 surface-card p-5">
        <h2 className="section-title mb-4">
          Monthly Revenue
        </h2>
        {salesData.length === 0 ? (
          <p className="text-sm text-zinc-400 py-16 text-center">
            No sales data yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickFormatter={(v) => formatChartAxis(Number(v))}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="revenue" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="surface-card p-5">
        <h2 className="section-title mb-4">
          Sales by Category
        </h2>
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-zinc-400 py-16 text-center">
            No category data yet.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="value"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {categoryBreakdown.map((entry) => (
                    <Cell key={entry.category} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${value}%`}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {categoryBreakdown.map((c) => (
                <span
                  key={c.category}
                  className="flex items-center gap-1 text-[11px] text-zinc-500"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.category}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
