"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExpenseReports } from "@/lib/types";
import { formatChartAxis, formatCurrency } from "@/lib/format";

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e4e4e7",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.06)",
};

type ExpenseChartsProps = {
  reports: ExpenseReports;
};

export default function ExpenseCharts({ reports }: ExpenseChartsProps) {
  const categoryData = reports.monthlyByCategory.map((row) => ({
    name: row.category,
    total: row.total,
  }));

  const requesterData = reports.byRequester.slice(0, 8).map((row) => ({
    name: row.requestedByName,
    total: row.total,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="surface-card p-5">
        <h2 className="section-title mb-4">Spend this month by category</h2>
        {categoryData.length === 0 ? (
          <p className="text-sm text-zinc-400 py-20 text-center">No settled expenses this month.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
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
              <Bar dataKey="total" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="surface-card p-5">
        <h2 className="section-title mb-4">Spend this month by requester</h2>
        {requesterData.length === 0 ? (
          <p className="text-sm text-zinc-400 py-20 text-center">No settled expenses this month.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={requesterData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickFormatter={(v) => formatChartAxis(Number(v))}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 11, fill: "#71717a" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="total" fill="#059669" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
