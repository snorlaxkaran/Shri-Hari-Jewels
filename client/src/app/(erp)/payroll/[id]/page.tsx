"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import { useAuth } from "@/lib/auth/auth-context";
import { canManagePayroll, canViewPayroll } from "@/lib/auth/permissions";
import {
  downloadPayslipPdf,
  emailPayslip,
  fetchPayrollRun,
  markPayrollRunPaid,
} from "@/lib/api/payroll";
import { getApiErrorMessage } from "@/lib/api/client";
import type { PayrollRun } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PayrollDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { user } = useAuth();
  const canView = user ? canViewPayroll(user.role) : false;
  const canManage = user ? canManagePayroll(user.role) : false;

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const [emailFor, setEmailFor] = useState<{ itemId: string; to: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      setRun(await fetchPayrollRun(id));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load payroll run."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (canView && id) void load();
    else setLoading(false);
  }, [canView, id, load]);

  const handleDownload = async (itemId: string, name: string) => {
    if (!run) return;
    setWorking(true);
    try {
      const blob = await downloadPayslipPdf(run.id, itemId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip-${name.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to download PDF."));
    } finally {
      setWorking(false);
    }
  };

  const handleEmail = async () => {
    if (!run || !emailFor) return;
    setWorking(true);
    try {
      await emailPayslip(run.id, emailFor.itemId, emailFor.to);
      setEmailFor(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to email payslip."));
    } finally {
      setWorking(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!run) return;
    setWorking(true);
    try {
      setRun(await markPayrollRunPaid(run.id));
      setShowPaidConfirm(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to mark as paid."));
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (!canView || !run) {
    return (
      <div className="page-content">
        <PageHeader title="Payroll Run" />
        <div className="surface-card p-8 text-center text-sm text-zinc-400">
          {error || "Payroll run not found."}
        </div>
      </div>
    );
  }

  const totalNet = run.items?.reduce((s, i) => s + i.netPay, 0) ?? 0;

  return (
    <div className="page-content">
      <PageHeader
        title={`${MONTHS[run.month - 1]} ${run.year} Payroll`}
        subtitle={`Status: ${run.status} · ${run.items?.length ?? 0} employees · ${formatCurrency(totalNet)} total`}
        action={
          canManage && run.status === "Finalized" ? (
            <button
              type="button"
              onClick={() => setShowPaidConfirm(true)}
              disabled={working}
              className="btn-primary px-4 py-2 text-sm"
            >
              Mark All as Paid
            </button>
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
              <th>Employee</th>
              <th className="text-right">Days Present</th>
              <th className="text-right">LOP</th>
              <th className="text-right">Gross</th>
              <th className="text-right">Net Pay</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {run.items?.map((item) => (
              <tr key={item.id}>
                <td className="font-medium">{item.employeeName}</td>
                <td className="td-num">
                  {item.daysPresent} / {item.daysInMonth}
                </td>
                <td className="td-num">{item.lossOfPayDays}</td>
                <td className="td-num">{formatCurrency(item.grossPay)}</td>
                <td className="td-num font-medium">
                  {formatCurrency(item.netPay)}
                </td>
                <td className="whitespace-nowrap">
                  {(run.status === "Finalized" || run.status === "Paid") && (
                    <>
                      <button
                        type="button"
                        disabled={working}
                        onClick={() =>
                          void handleDownload(
                            item.id,
                            item.employeeName ?? "employee",
                          )
                        }
                        className="text-xs text-blue-600 hover:underline mr-3"
                      >
                        Download PDF
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          disabled={working}
                          onClick={() =>
                            setEmailFor({ itemId: item.id, to: "" })
                          }
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Email
                        </button>
                      )}
                    </>
                  )}
                  {run.status === "Draft" && (
                    <span className="text-xs text-zinc-400">
                      Finalize to download
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {emailFor && (
        <div className="modal-overlay">
          <div className="modal-panel p-5 max-w-sm w-full">
            <h3 className="font-semibold mb-3">Email payslip</h3>
            <input
              type="email"
              placeholder="employee@email.com"
              className="input-field w-full px-3 py-2 text-sm mb-4"
              value={emailFor.to}
              onChange={(e) =>
                setEmailFor({ ...emailFor, to: e.target.value })
              }
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEmailFor(null)}
                className="btn-secondary px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={working || !emailFor.to.includes("@")}
                onClick={() => void handleEmail()}
                className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showPaidConfirm}
        title="Mark payroll as paid?"
        message="Confirm that bank transfers for all employees in this run have been completed."
        confirmLabel={working ? "Saving…" : "Mark as paid"}
        onConfirm={() => void handleMarkPaid()}
        onCancel={() => setShowPaidConfirm(false)}
      />
    </div>
  );
}
