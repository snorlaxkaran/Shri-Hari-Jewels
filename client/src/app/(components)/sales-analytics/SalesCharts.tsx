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
import { categoryBreakdown, salesData } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e4e4e7",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.06)",
};

export default function SalesCharts() {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="surface-card p-5">
          <h2 className="text-sm font-semibold mb-4 text-zinc-900">
            Revenue Trend
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
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
                stroke="#18181b"
                strokeWidth={2}
                dot={{ fill: "#18181b", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="surface-card p-5">
          <h2 className="text-sm font-semibold mb-4 text-zinc-900">
            Orders by Month
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="orders" fill="#71717a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="surface-card p-5 mt-4">
        <h2 className="text-sm font-semibold mb-4 text-zinc-900">
          Category Performance
        </h2>
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
      </div>
    </>
  );
}
