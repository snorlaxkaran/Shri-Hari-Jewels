"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canManagePayroll, canViewPayroll } from "@/lib/auth/permissions";
import { fetchPayrollRuns } from "@/lib/api/payroll";
import { getApiErrorMessage } from "@/lib/api/client";
import type { PayrollRun } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const statusClass: Record<PayrollRun["status"], string> = {
  Draft: "bg-amber-100 text-amber-800",
  Finalized: "bg-blue-100 text-blue-800",
  Paid: "bg-emerald-100 text-emerald-800",
};

export default function PayrollListPage() {
  const { user } = useAuth();
  const canView = user ? canViewPayroll(user.role) : false;
  const canManage = user ? canManagePayroll(user.role) : false;

  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setRuns(await fetchPayrollRuns());
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load payroll runs."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) void load();
    else setLoading(false);
  }, [canView, load]);

  if (loading) return <PageSkeleton />;

  if (!canView) {
    return (
      <div className="page-content">
        <PageHeader title="Payroll" subtitle="Monthly salary runs" />
        <div className="surface-card p-8 text-center text-sm text-zinc-400">
          You do not have access to payroll.
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Payroll"
        subtitle="Generate and finalize monthly payslips"
        action={
          canManage ? (
            <Link
              href="/payroll/new"
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              New Payroll Run
            </Link>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Status</th>
              <th>Employees</th>
              <th className="text-right">Total Net Pay</th>
              <th>Generated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const totalNet =
                run.items?.reduce((s, i) => s + i.netPay, 0) ?? 0;
              return (
                <tr key={run.id}>
                  <td className="font-medium">
                    {MONTHS[run.month - 1]} {run.year}
                  </td>
                  <td>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${statusClass[run.status]}`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="td-muted">{run.items?.length ?? 0}</td>
                  <td className="td-num">{formatCurrency(totalNet)}</td>
                  <td className="td-muted">{formatDate(run.createdAt)}</td>
                  <td className="text-right">
                    <Link
                      href={`/payroll/${run.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!runs.length && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-zinc-400">
                  No payroll runs yet. Mark attendance first, then start a new run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
