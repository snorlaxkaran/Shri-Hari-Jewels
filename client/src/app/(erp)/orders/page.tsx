"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ListPageShell from "@/app/(components)/ListPageShell";
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

  return (
    <ListPageShell
      title="Orders"
      subtitle={`${filtered.length} custom orders`}
      loading={!hydrated || loading}
      error={error || null}
      filterValue={statusFilter}
      filterOptions={statuses.map((s) => ({
        value: s,
        label: s === "All" ? "All statuses" : s,
      }))}
      onFilterChange={(value) => setStatusFilter(value as OrderStatus | "All")}
      countLabel={`${filtered.length} orders`}
      isEmpty={filtered.length === 0}
      emptyMessage="No orders yet. Create a custom order for a customer."
      action={
        <Link href="/orders/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Order
        </Link>
      }
    >
      <div className="data-table-wrap">
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
                  {order.estimatedTotal ? formatCurrency(order.estimatedTotal) : "-"}
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
    </ListPageShell>
  );
}
