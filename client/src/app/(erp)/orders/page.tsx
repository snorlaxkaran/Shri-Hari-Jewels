"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import { useOrders } from "@/lib/orders/orders-context";
import { useSales } from "@/lib/sales/sales-context";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus } from "lucide-react";
import type { OrderStatus } from "@/lib/types";

const statuses: (OrderStatus | "All")[] = [
  "All",
  "Pending",
  "Designing",
  "Production",
  "QC",
  "Ready",
  "Delivered",
  "Cancelled",
];

export default function OrdersPage() {
  const { orders, hydrated, loading, error, patchOrder } = useOrders();
  const { refresh: refreshSales } = useSales();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");

  const filtered = useMemo(
    () =>
      statusFilter === "All"
        ? orders
        : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter],
  );

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    await patchOrder(orderId, { status });
    await refreshSales();
  };

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Orders"
        subtitle={`${filtered.length} custom orders`}
        action={
          <Link
            href="/orders/new"
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={16} />
            New Order
          </Link>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="filter-bar">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as OrderStatus | "All")
          }
          className="filter-select"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <span className="filter-count">{filtered.length} orders</span>
      </div>

      <div className="surface-card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">
            No orders yet. Create a custom order for a customer.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order No.</th>
                  <th>Customer</th>
                  <th>Description</th>
                  <th>Est. Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id}>
                    <td className="td-code">{order.orderNo}</td>
                    <td className="td-muted">
                      <p>{order.customerName}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {order.customerMobile}
                      </p>
                    </td>
                    <td className="td-muted max-w-xs truncate">{order.description}</td>
                    <td className="td-num">
                      {order.estimatedTotal
                        ? formatCurrency(order.estimatedTotal)
                        : "-"}
                    </td>
                    <td>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        className="filter-select"
                      >
                        {statuses
                          .filter((s) => s !== "All")
                          .map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      <StatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="td-muted">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
