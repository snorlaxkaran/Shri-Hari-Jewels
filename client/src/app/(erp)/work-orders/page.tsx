"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import FilterPill from "@/app/(components)/ui/FilterPill";
import { useWorkOrders } from "@/lib/work-orders/work-orders-context";
import type {
  WorkOrderStatus,
  WorkOrderPriority,
} from "@/lib/types";
import { formatDate } from "@/lib/format";

const statuses: (WorkOrderStatus | "All")[] = [
  "All",
  "Open",
  "In Production",
  "QC",
  "Completed",
  "Cancelled",
];

const priorities: WorkOrderPriority[] = ["Low", "Normal", "High"];

export default function WorkOrdersPage() {
  const { workOrders, hydrated, loading, error, patchWorkOrder } =
    useWorkOrders();
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | "All">(
    "All",
  );
  const [priorityFilter, setPriorityFilter] = useState<
    WorkOrderPriority | "All"
  >("All");

  const filtered = useMemo(
    () =>
      workOrders.filter((wo) => {
        const statusMatch =
          statusFilter === "All" || wo.status === statusFilter;
        const priorityMatch =
          priorityFilter === "All" || wo.priority === priorityFilter;
        return statusMatch && priorityMatch;
      }),
    [workOrders, statusFilter, priorityFilter],
  );

  const handleStatusChange = async (id: string, status: WorkOrderStatus) => {
    await patchWorkOrder(id, { status });
  };

  const handlePriorityChange = async (
    id: string,
    priority: WorkOrderPriority,
  ) => {
    await patchWorkOrder(id, { priority });
  };

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Work Orders"
        subtitle="Production and manufacturing tracking"
        action={
          <Link
            href="/work-orders/new"
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={16} />
            New Work Order
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {statuses.map((status) => (
          <FilterPill
            key={status}
            label={status}
            active={statusFilter === status}
            onClick={() => setStatusFilter(status)}
          />
        ))}
        {priorities.map((priority) => (
          <FilterPill
            key={priority}
            label={priority}
            active={priorityFilter === priority}
            onClick={() => setPriorityFilter(priority)}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="surface-card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">
            No work orders available. Create a new production task.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500">
                  <th className="text-left px-5 py-3 font-medium">
                    Work Order
                  </th>
                  <th className="text-left px-5 py-3 font-medium">Title</th>
                  <th className="text-left px-5 py-3 font-medium">Order No.</th>
                  <th className="text-left px-5 py-3 font-medium">Assignee</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Priority</th>
                  <th className="text-left px-5 py-3 font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((workOrder) => (
                  <tr
                    key={workOrder.id}
                    className="border-t border-zinc-100 text-zinc-900"
                  >
                    <td className="px-5 py-3 font-medium">
                      {workOrder.workOrderNo}
                    </td>
                    <td className="px-5 py-3 max-w-xs truncate">
                      {workOrder.title}
                    </td>
                    <td className="px-5 py-3">{workOrder.orderNo ?? "-"}</td>
                    <td className="px-5 py-3">
                      {workOrder.assignedToName ?? "Unassigned"}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={workOrder.status}
                        onChange={(e) =>
                          handleStatusChange(
                            workOrder.id,
                            e.target.value as WorkOrderStatus,
                          )
                        }
                        className="input-field text-xs py-1 px-2"
                      >
                        {statuses
                          .filter((s) => s !== "All")
                          .map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={workOrder.priority}
                        onChange={(e) =>
                          handlePriorityChange(
                            workOrder.id,
                            e.target.value as WorkOrderPriority,
                          )
                        }
                        className="input-field text-xs py-1 px-2"
                      >
                        {priorities.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      {workOrder.dueDate ? formatDate(workOrder.dueDate) : "-"}
                    </td>
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
