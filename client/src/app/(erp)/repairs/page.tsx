"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import FilterPill from "@/app/(components)/ui/FilterPill";
import { fetchRepairs } from "@/lib/api/repairs";
import { getApiErrorMessage } from "@/lib/api/client";
import type { RepairOrder, RepairStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

const statuses: (RepairStatus | "All")[] = [
  "All",
  "Received",
  "Estimated",
  "Awaiting Approval",
  "Approved",
  "In Progress",
  "Quality Check",
  "Ready for Pickup",
  "Delivered",
  "Rejected",
  "Cancelled",
];

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<RepairStatus | "All">("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchRepairs({
      status: statusFilter === "All" ? undefined : statusFilter,
      search: search.trim() || undefined,
    })
      .then(setRepairs)
      .catch((err) =>
        setError(getApiErrorMessage(err, "Could not load repairs.")),
      )
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  const filtered = useMemo(() => repairs, [repairs]);

  if (loading && repairs.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Repairs"
        subtitle="Customer repair intake, workshop tracking, and pickup"
        action={
          <Link
            href="/repairs/new"
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={16} />
            New Repair
          </Link>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="filter-bar flex-wrap">
        {statuses.map((status) => (
          <FilterPill
            key={status}
            label={status}
            active={statusFilter === status}
            onClick={() => setStatusFilter(status)}
          />
        ))}
        <input
          type="search"
          placeholder="Search repair no, customer, mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field text-sm py-1.5 px-3 min-w-[220px]"
        />
        <span className="filter-count">{filtered.length} repairs</span>
      </div>

      <div className="surface-card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">
            No repair orders yet. Create one at the counter for resizing, polishing, or stone work.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Repair No.</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Estimate</th>
                  <th>Ready By</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((repair) => (
                  <tr key={repair.id}>
                    <td className="td-code">
                      <Link
                        href={`/repairs/${repair.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {repair.repairNo}
                      </Link>
                    </td>
                    <td>
                      <div className="font-medium text-sm">{repair.customerName}</div>
                      <div className="text-xs text-zinc-500">{repair.customerMobile}</div>
                    </td>
                    <td className="max-w-xs truncate td-muted">
                      {repair.itemDescription}
                    </td>
                    <td>
                      <StatusBadge status={repair.status} />
                    </td>
                    <td className="td-num">
                      {repair.estimatedCost != null
                        ? formatCurrency(repair.estimatedCost)
                        : "—"}
                    </td>
                    <td className="td-muted">
                      {repair.estimatedReadyDate
                        ? formatDate(repair.estimatedReadyDate)
                        : "—"}
                    </td>
                    <td className="td-muted">{formatDate(repair.createdAt)}</td>
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
