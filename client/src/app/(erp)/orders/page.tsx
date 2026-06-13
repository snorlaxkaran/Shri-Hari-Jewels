"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import FilterPill from "@/app/(components)/ui/FilterPill";
import { useCustomers } from "@/lib/customers/customers-context";
import { useOrders } from "@/lib/orders/orders-context";
import { useSales } from "@/lib/sales/sales-context";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus } from "lucide-react";
import type { OrderStatus } from "@/lib/types";

const AddOrderModal = dynamic(
  () => import("@/app/(components)/AddOrderModal"),
  { ssr: false },
);

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
  const { customers } = useCustomers();
  const { orders, hydrated, loading, error, addOrder, patchOrder } = useOrders();
  const { refresh: refreshSales } = useSales();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(
    () =>
      statusFilter === "All"
        ? orders
        : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter],
  );

  const handleAddOrder = async (input: Parameters<typeof addOrder>[0]) => {
    await addOrder(input);
    await refreshSales();
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    await patchOrder(orderId, { status });
    await refreshSales();
  };

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${filtered.length} custom orders`}
        action={
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={16} />
            New Order
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

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
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">
            No orders yet. Create a custom order for a customer.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500">
                  <th className="text-left px-5 py-3 font-medium">Order No.</th>
                  <th className="text-left px-5 py-3 font-medium">Customer</th>
                  <th className="text-left px-5 py-3 font-medium">Description</th>
                  <th className="text-left px-5 py-3 font-medium">Est. Total</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Payment</th>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id} className="border-t border-zinc-100 text-zinc-900">
                    <td className="px-5 py-3 font-medium">{order.orderNo}</td>
                    <td className="px-5 py-3">
                      <p>{order.customerName}</p>
                      <p className="text-xs text-zinc-400">{order.customerMobile}</p>
                    </td>
                    <td className="px-5 py-3 max-w-xs truncate">{order.description}</td>
                    <td className="px-5 py-3">
                      {order.estimatedTotal
                        ? formatCurrency(order.estimatedTotal)
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        className="input-field text-xs py-1 px-2"
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
                    <td className="px-5 py-3">
                      <StatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="px-5 py-3">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <AddOrderModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          customers={customers}
          onSubmit={handleAddOrder}
        />
      )}
    </div>
  );
}
