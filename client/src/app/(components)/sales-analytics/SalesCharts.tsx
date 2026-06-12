"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
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

type SalesChartsProps = {
  salesData: SalesDataPoint[];
  categoryBreakdown: CategoryBreakdown[];
};

export default function SalesCharts({
  salesData,
  categoryBreakdown,
}: SalesChartsProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="surface-card p-5">
          <h2 className="section-title mb-4">
            Revenue Trend
          </h2>
          {salesData.length === 0 ? (
            <p className="text-sm text-zinc-400 py-20 text-center">
              No sales data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={salesData}>
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
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  dot={{ fill: "#1d4ed8", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="surface-card p-5">
          <h2 className="section-title mb-4">
            Sales by Month
          </h2>
          {salesData.length === 0 ? (
            <p className="text-sm text-zinc-400 py-20 text-center">
              No sales data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="surface-card p-5 mt-4">
        <h2 className="section-title mb-4">Category Performance</h2>
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">
            No category data yet.
          </p>
        ) : (
          <div className="space-y-3">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-700">{cat.category}</span>
                  <span className="text-zinc-400">{cat.value}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-zinc-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${cat.value}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
