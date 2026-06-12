"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import StatusBadge from "@/app/(components)/StatusBadge";
import FilterPill from "@/app/(components)/ui/FilterPill";
import { orders } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus } from "lucide-react";
import type { OrderStatus } from "@/lib/types";

const statuses: (OrderStatus | "All")[] = [
  "All",
  "Pending",
  "Processing",
  "Ready",
  "Delivered",
  "Cancelled",
];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");

  const filtered = useMemo(
    () =>
      statusFilter === "All"
        ? orders
        : orders.filter((o) => o.status === statusFilter),
    [statusFilter],
  );

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${filtered.length} orders`}
        action={
          <button className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
            <Plus size={16} />
            New Order
          </button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map((s) => (
          <FilterPill
            key={s}
            label={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          />
        ))}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500">
                <th className="text-left px-5 py-3 font-medium">Order No.</th>
                <th className="text-left px-5 py-3 font-medium">Customer</th>
                <th className="text-left px-5 py-3 font-medium">Items</th>
                <th className="text-left px-5 py-3 font-medium">Total</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Payment</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-zinc-100 text-zinc-900 hover:bg-zinc-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 font-medium">{order.orderNo}</td>
                  <td className="px-5 py-3">{order.customerName}</td>
                  <td className="px-5 py-3">{order.items}</td>
                  <td className="px-5 py-3">{formatCurrency(order.total)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.paymentStatus} />
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
