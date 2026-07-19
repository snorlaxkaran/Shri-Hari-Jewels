"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import { fetchHallmarkBatches } from "@/lib/api/hallmark";
import { getApiErrorMessage } from "@/lib/api/client";
import type { HallmarkBatchSummary } from "@/lib/types";
import { formatDate } from "@/lib/format";

const statusLabel: Record<HallmarkBatchSummary["status"], string> = {
  Draft: "Draft",
  SentToCenter: "Sent to Center",
  Received: "Received",
  PartiallyReceived: "Partially Received",
};

export default function HallmarkPage() {
  const [batches, setBatches] = useState<HallmarkBatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHallmarkBatches()
      .then(setBatches)
      .catch((err) =>
        setError(getApiErrorMessage(err, "Could not load hallmark batches.")),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title="Hallmark (HUID)"
        subtitle="Send pieces for BIS hallmarking and record HUID numbers on return"
        action={
          <Link
            href="/hallmark/new"
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={16} />
            New Batch
          </Link>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="surface-card overflow-hidden">
        {batches.length === 0 ? (
          <p className="px-5 py-10 text-sm text-zinc-400 text-center">
            No hallmark batches yet. Create one from un-hallmarked gold stock.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Center</th>
                <th>Status</th>
                <th>Items</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td>
                    <Link
                      href={`/hallmark/${batch.id}`}
                      className="font-mono text-sm text-blue-600 hover:underline"
                    >
                      {batch.batchNo}
                    </Link>
                  </td>
                  <td className="td-muted">{batch.hallmarkCenter}</td>
                  <td>
                    <StatusBadge status={statusLabel[batch.status]} />
                  </td>
                  <td className="td-num">
                    {batch.receivedCount}/{batch.itemCount}
                  </td>
                  <td className="td-muted">{formatDate(batch.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
