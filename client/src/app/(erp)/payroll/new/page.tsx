"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import { useAuth } from "@/lib/auth/auth-context";
import { canManagePayroll } from "@/lib/auth/permissions";
import { fetchBranches } from "@/lib/api/branches";
import { fetchEmployees } from "@/lib/api/employees";
import {
  createPayrollRun,
  fetchPayrollAttendancePreview,
  finalizePayrollRun,
  updatePayslipItem,
} from "@/lib/api/payroll";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  Branch,
  PayrollAttendancePreview,
  PayrollRun,
  PayslipItem,
} from "@/lib/types";
import { formatCurrency } from "@/lib/format";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Step = 1 | 2 | 3 | 4 | 5;

export default function NewPayrollPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user ? canManagePayroll(user.role) : false;

  const now = new Date();
  const [step, setStep] = useState<Step>(1);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [preview, setPreview] = useState<PayrollAttendancePreview[]>([]);
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [showFinalize, setShowFinalize] = useState(false);
  const [editCell, setEditCell] = useState<{
    itemId: string;
    field: keyof PayslipItem;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    void fetchBranches()
      .then((b) => {
        const active = b.filter((x) => x.active);
        setBranches(active);
        if (active.length > 0) setBranchId(active[0].id);
      })
      .finally(() => setLoading(false));
  }, [canManage]);

  const loadStep1Preview = useCallback(async () => {
    if (!branchId) return;
    setError("");
    setWorking(true);
    try {
      const emps = await fetchEmployees(branchId);
      setActiveCount(emps.filter((e) => e.active).length);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load employee count."));
    } finally {
      setWorking(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (step === 1 && branchId) void loadStep1Preview();
  }, [step, branchId, loadStep1Preview]);

  const loadStep2Preview = useCallback(async () => {
    if (!branchId) return;
    setError("");
    setWorking(true);
    try {
      setPreview(
        await fetchPayrollAttendancePreview({ month, year, branchId }),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load attendance summary."));
    } finally {
      setWorking(false);
    }
  }, [branchId, month, year]);

  useEffect(() => {
    if (step === 2 && branchId) void loadStep2Preview();
  }, [step, branchId, loadStep2Preview]);

  const createRun = async () => {
    setError("");
    setWorking(true);
    try {
      const created = await createPayrollRun({ month, year, branchId });
      setRun(created);
      setStep(3);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create payroll run."));
    } finally {
      setWorking(false);
    }
  };

  const totalNet = useMemo(
    () => run?.items?.reduce((s, i) => s + i.netPay, 0) ?? 0,
    [run],
  );

  const incompleteCount = preview.filter((p) => p.incomplete).length;

  const handleEditSave = async (item: PayslipItem) => {
    if (!run || !editCell) return;
    const val = Number(editValue);
    if (Number.isNaN(val)) return;
    setWorking(true);
    try {
      const updated = await updatePayslipItem(run.id, item.id, {
        [editCell.field]: val,
      });
      setRun(updated);
      setEditCell(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update payslip line."));
    } finally {
      setWorking(false);
    }
  };

  const handleFinalize = async () => {
    if (!run) return;
    setWorking(true);
    try {
      const finalized = await finalizePayrollRun(run.id);
      setRun(finalized);
      setStep(5);
      setShowFinalize(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to finalize."));
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (!canManage) {
    return (
      <div className="page-content">
        <PageHeader title="New Payroll Run" />
        <div className="surface-card p-8 text-center text-sm text-zinc-400">
          Only admins and accountants can run payroll.
        </div>
      </div>
    );
  }

  return (
    <div className="page-content max-w-5xl">
      <PageHeader
        title="New Payroll Run"
        subtitle={`Step ${step} of 5`}
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded ${
              s <= step ? "bg-amber-500" : "bg-zinc-200"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="surface-card p-6 space-y-4">
          <h3 className="font-semibold text-zinc-800">Select month & branch</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Month</label>
              <select
                className="input-field w-full px-3 py-2 text-sm"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Year</label>
              <input
                type="number"
                className="input-field w-full px-3 py-2 text-sm"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            {branches.length > 1 && (
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Branch</label>
                <select
                  className="input-field w-full px-3 py-2 text-sm"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              void loadStep1Preview();
              setStep(2);
            }}
            disabled={!branchId || working}
            className="btn-primary px-4 py-2 text-sm"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="surface-card p-6 space-y-4">
          <h3 className="font-semibold text-zinc-800">Review attendance summary</h3>
          <p className="text-sm text-zinc-500">
            {activeCount} active employees for {MONTHS[month - 1]} {year}.
            {incompleteCount > 0 && (
              <span className="text-amber-700 font-medium">
                {" "}
                {incompleteCount} have incomplete attendance (unmarked weekdays).
              </span>
            )}
          </p>
          <div className="overflow-auto">
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th className="text-right">Present</th>
                  <th className="text-right">Absent</th>
                  <th className="text-right">Leave</th>
                  <th className="text-right">LOP</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p) => (
                  <tr key={p.employeeId}>
                    <td>{p.employeeName}</td>
                    <td className="td-num">{p.daysPresent}</td>
                    <td className="td-num">{p.daysAbsent}</td>
                    <td className="td-num">{p.daysLeave}</td>
                    <td className="td-num">{p.lossOfPayDays}</td>
                    <td>
                      {p.incomplete ? (
                        <span className="text-xs text-amber-700">Incomplete</span>
                      ) : (
                        <span className="text-xs text-emerald-600">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                void loadStep2Preview();
                void createRun();
              }}
              disabled={working}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {working ? "Computing…" : "Compute Pay"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && run && (
        <div className="surface-card p-6 space-y-4">
          <h3 className="font-semibold text-zinc-800">Review computed pay</h3>
          <p className="text-xs text-zinc-500">
            Click any amount to override before finalizing.
          </p>
          <div className="overflow-auto">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th className="text-right">Basic</th>
                  <th className="text-right">HRA</th>
                  <th className="text-right">Gross</th>
                  <th className="text-right">Deductions</th>
                  <th className="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {run.items?.map((item) => {
                  const ded =
                    item.pfDeduction +
                    item.esiDeduction +
                    item.professionalTax +
                    item.otherDeductions;
                  return (
                    <tr key={item.id}>
                      <td>{item.employeeName}</td>
                      {(["basicPay", "hra", "grossPay"] as const).map((field) => (
                        <td key={field} className="td-num">
                          {editCell?.itemId === item.id &&
                          editCell.field === field ? (
                            <input
                              autoFocus
                              className="input-field w-20 px-1 py-0.5 text-right"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => void handleEditSave(item)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  void handleEditSave(item);
                                }
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className="hover:underline"
                              onClick={() => {
                                setEditCell({ itemId: item.id, field });
                                setEditValue(String(item[field]));
                              }}
                            >
                              {formatCurrency(item[field])}
                            </button>
                          )}
                        </td>
                      ))}
                      <td className="td-num">{formatCurrency(ded)}</td>
                      <td className="td-num font-medium">
                        {editCell?.itemId === item.id &&
                        editCell.field === "netPay" ? (
                          <input
                            autoFocus
                            className="input-field w-20 px-1 py-0.5 text-right"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => void handleEditSave(item)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                void handleEditSave(item);
                              }
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="hover:underline"
                            onClick={() => {
                              setEditCell({ itemId: item.id, field: "netPay" });
                              setEditValue(String(item.netPay));
                            }}
                          >
                            {formatCurrency(item.netPay)}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm font-medium">
            Total net pay: {formatCurrency(totalNet)}
          </p>
          <button
            type="button"
            onClick={() => setStep(4)}
            className="btn-primary px-4 py-2 text-sm"
          >
            Continue to Finalize
          </button>
        </div>
      )}

      {step === 4 && run && (
        <div className="surface-card p-6 space-y-4">
          <h3 className="font-semibold text-zinc-800">Confirm & finalize</h3>
          <p className="text-sm text-zinc-600">
            This will generate final payslips for{" "}
            <strong>{run.items?.length ?? 0} employees</strong> totalling{" "}
            <strong>{formatCurrency(totalNet)}</strong>. This cannot be undone
            — you can record corrections in a future run, but this run will be
            locked.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setShowFinalize(true)}
              className="btn-primary px-4 py-2 text-sm bg-red-700 hover:bg-red-800"
            >
              Finalize Payroll
            </button>
          </div>
        </div>
      )}

      {step === 5 && run && (
        <div className="surface-card p-6 space-y-4 text-center">
          <h3 className="font-semibold text-emerald-800">Payslips generated</h3>
          <p className="text-sm text-zinc-600">
            Payroll for {MONTHS[month - 1]} {year} is finalized.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/payroll/${run.id}`)}
            className="btn-primary px-4 py-2 text-sm"
          >
            View Payslips & Download
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showFinalize}
        title="Finalize payroll?"
        message={`Lock payslips for ${run?.items?.length ?? 0} employees totalling ${formatCurrency(totalNet)}?`}
        confirmLabel={working ? "Finalizing…" : "Yes, finalize"}
        onConfirm={() => void handleFinalize()}
        onCancel={() => setShowFinalize(false)}
      />
    </div>
  );
}
