"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Coffee,
  Hammer,
  Package,
  PenLine,
  Plus,
  Truck,
  Wrench,
} from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import FilterPill from "@/app/(components)/ui/FilterPill";
import MotifImageUpload from "@/app/(components)/motifs/MotifImageUpload";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageExpenses } from "@/lib/auth/permissions";
import {
  approveExpense,
  attachExpenseReceipt,
  createDirectExpense,
  disburseExpense,
  fetchExpenseReports,
  fetchExpenses,
  fetchPettyCashFloat,
  rejectExpense,
  replenishPettyCashFloat,
  setupPettyCashFloat,
} from "@/lib/api/expenses";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  Expense,
  ExpenseCategory,
  ExpenseReports,
  ExpenseStatus,
  PettyCashFloatView,
} from "@/lib/types";
import { formatCurrency, formatDate, parseMoneyInput } from "@/lib/format";

const ExpenseCharts = dynamic(
  () => import("@/app/(components)/expenses/ExpenseCharts"),
  { ssr: false, loading: () => <PageSkeleton /> },
);

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type TabKey = "pending" | "awaiting-receipt" | "all" | "reports";

const categories: ExpenseCategory[] = [
  "Tools",
  "Pantry",
  "Stationery",
  "Maintenance",
  "Transport",
  "Miscellaneous",
];

const categoryIcon = (category: ExpenseCategory) => {
  switch (category) {
    case "Tools":
      return <Hammer size={14} className="text-zinc-400" />;
    case "Pantry":
      return <Coffee size={14} className="text-zinc-400" />;
    case "Stationery":
      return <PenLine size={14} className="text-zinc-400" />;
    case "Maintenance":
      return <Wrench size={14} className="text-zinc-400" />;
    case "Transport":
      return <Truck size={14} className="text-zinc-400" />;
    default:
      return <Package size={14} className="text-zinc-400" />;
  }
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const canManage = user ? canManageExpenses(user.role) : false;

  const [tab, setTab] = useState<TabKey>("pending");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [floatView, setFloatView] = useState<PettyCashFloatView | null>(null);
  const [reports, setReports] = useState<ExpenseReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "All">("All");
  const [showDirectForm, setShowDirectForm] = useState(false);
  const [showFloatSetup, setShowFloatSetup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptForId, setReceiptForId] = useState<string | null>(null);
  const [rejectForId, setRejectForId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptVendor, setReceiptVendor] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>();

  const [directCategory, setDirectCategory] = useState<ExpenseCategory>("Pantry");
  const [directDescription, setDirectDescription] = useState("");
  const [directAmount, setDirectAmount] = useState("");
  const [directRequester, setDirectRequester] = useState("");
  const [directVendor, setDirectVendor] = useState("");
  const [directReceiptUrl, setDirectReceiptUrl] = useState<string | undefined>();

  const [floatAmount, setFloatAmount] = useState("5000");
  const [custodianName, setCustodianName] = useState("");
  const [thresholdPct, setThresholdPct] = useState("20");

  const load = useCallback(async () => {
    setError("");
    try {
      const statusParam =
        tab === "pending"
          ? ("Requested" as ExpenseStatus)
          : tab === "awaiting-receipt"
            ? ("Disbursed" as ExpenseStatus)
            : undefined;

      const [expenseRows, floatRow, reportRows] = await Promise.all([
        fetchExpenses({
          status: statusParam,
          category: categoryFilter === "All" ? undefined : categoryFilter,
          search: search.trim() || undefined,
        }),
        fetchPettyCashFloat(),
        tab === "reports" ? fetchExpenseReports() : Promise.resolve(null),
      ]);

      setExpenses(expenseRows);
      setFloatView(floatRow);
      setReports(reportRows);
      if (user && !custodianName) setCustodianName(user.name);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load expenses."));
    } finally {
      setLoading(false);
    }
  }, [tab, categoryFilter, search, user, custodianName]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const filtered = useMemo(() => expenses, [expenses]);

  const floatProgress = useMemo(() => {
    if (!floatView || floatView.floatAmount <= 0) return 0;
    return Math.max(0, Math.min(100, (floatView.currentBalance / floatView.floatAmount) * 100));
  }, [floatView]);

  const handleApprove = async (id: string) => {
    setSubmitting(true);
    setError("");
    try {
      await approveExpense(id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to approve expense."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisburse = async (id: string) => {
    setSubmitting(true);
    setError("");
    try {
      await disburseExpense(id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to disburse expense."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await rejectExpense(id, { rejectionReason });
      setRejectForId(null);
      setRejectionReason("");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reject expense."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceipt = async (id: string) => {
    if (!receiptAmount.trim()) {
      setError("Actual amount is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await attachExpenseReceipt(id, {
        actualAmount: parseMoneyInput(receiptAmount),
        vendorName: receiptVendor.trim() || undefined,
        receiptUrl,
      });
      setReceiptForId(null);
      setReceiptAmount("");
      setReceiptVendor("");
      setReceiptUrl(undefined);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to attach receipt."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createDirectExpense({
        category: directCategory,
        description: directDescription,
        actualAmount: parseMoneyInput(directAmount),
        requestedByName: directRequester.trim() || undefined,
        vendorName: directVendor.trim() || undefined,
        receiptUrl: directReceiptUrl,
      });
      setShowDirectForm(false);
      setDirectDescription("");
      setDirectAmount("");
      setDirectRequester("");
      setDirectVendor("");
      setDirectReceiptUrl(undefined);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create direct expense."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFloatSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await setupPettyCashFloat({
        floatAmount: parseMoneyInput(floatAmount),
        custodianName: custodianName.trim(),
        lowBalanceThresholdPct: parseMoneyInput(thresholdPct || "20"),
      });
      setShowFloatSetup(false);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to set up petty cash float."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplenish = async () => {
    setSubmitting(true);
    setError("");
    try {
      await replenishPettyCashFloat();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to replenish float."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && expenses.length === 0 && !floatView && tab !== "reports") {
    return <PageSkeleton />;
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Expenses"
        subtitle="Petty cash requests, disbursements, and receipt tracking"
        action={
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={() => setShowDirectForm((v) => !v)}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Direct Entry
              </button>
            )}
            <Link
              href="/expenses/new"
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              Request Cash
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="surface-card p-5 mb-6">
        {floatView ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-medium text-zinc-800">Petty cash float</p>
                <p className="text-2xl font-semibold text-zinc-900 mt-1">
                  {formatCurrency(floatView.currentBalance)}{" "}
                  <span className="text-base font-normal text-zinc-500">
                    of {formatCurrency(floatView.floatAmount)} remaining
                  </span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Custodian: {floatView.custodianName}
                  {floatView.lastReplenishedAt
                    ? ` · Last replenished ${formatDate(floatView.lastReplenishedAt)}`
                    : ""}
                </p>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-sm"
                    onClick={() => setShowFloatSetup(true)}
                  >
                    Configure
                  </button>
                  <button
                    type="button"
                    className="btn-primary px-3 py-1.5 text-sm disabled:opacity-60"
                    disabled={submitting}
                    onClick={() => void handleReplenish()}
                  >
                    Replenish float
                  </button>
                </div>
              )}
            </div>
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  floatView.lowBalanceWarning ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${floatProgress}%` }}
              />
            </div>
            {floatView.lowBalanceWarning && (
              <div className="mt-3 px-3 py-2 rounded-lg text-sm border border-amber-200 bg-amber-50 text-amber-800">
                Float is below {floatView.lowBalanceThresholdPct}% — replenish before it runs dry.
              </div>
            )}
          </>
        ) : canManage ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-600">
              Petty cash float is not set up for your branch yet.
            </p>
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              onClick={() => setShowFloatSetup(true)}
            >
              Set up float
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Petty cash float has not been configured for your branch.
          </p>
        )}
      </div>

      {showFloatSetup && canManage && (
        <form onSubmit={handleFloatSetup} className="surface-card p-5 mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-800">Configure petty cash float</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Float amount</label>
              <input
                className={fieldClass}
                value={floatAmount}
                onChange={(e) => setFloatAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Custodian name</label>
              <input
                className={fieldClass}
                value={custodianName}
                onChange={(e) => setCustodianName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Low balance warning (%)</label>
              <input
                className={fieldClass}
                value={thresholdPct}
                onChange={(e) => setThresholdPct(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-sm"
              onClick={() => setShowFloatSetup(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary px-4 py-2 text-sm">
              Save float
            </button>
          </div>
        </form>
      )}

      {showDirectForm && canManage && (
        <form onSubmit={handleDirectEntry} className="surface-card p-5 mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-800">Direct expense entry</h3>
          <p className="text-xs text-zinc-500">
            For purchases logged on someone&apos;s behalf (e.g. pantry supplies) — skips approval.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Category</label>
              <select
                className={fieldClass}
                value={directCategory}
                onChange={(e) => setDirectCategory(e.target.value as ExpenseCategory)}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Amount</label>
              <input
                className={fieldClass}
                value={directAmount}
                onChange={(e) => setDirectAmount(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Description</label>
              <input
                className={fieldClass}
                value={directDescription}
                onChange={(e) => setDirectDescription(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>On behalf of (optional)</label>
              <input
                className={fieldClass}
                value={directRequester}
                onChange={(e) => setDirectRequester(e.target.value)}
                placeholder="Pantry staff name"
              />
            </div>
            <div>
              <label className={labelClass}>Vendor (optional)</label>
              <input
                className={fieldClass}
                value={directVendor}
                onChange={(e) => setDirectVendor(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <MotifImageUpload
                imageUrl={directReceiptUrl}
                onChange={setDirectReceiptUrl}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-sm"
              onClick={() => setShowDirectForm(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary px-4 py-2 text-sm">
              Record expense
            </button>
          </div>
        </form>
      )}

      <div className="filter-bar flex-wrap mb-4">
        <FilterPill label="Pending Approval" active={tab === "pending"} onClick={() => setTab("pending")} />
        <FilterPill
          label="Awaiting Receipt"
          active={tab === "awaiting-receipt"}
          onClick={() => setTab("awaiting-receipt")}
        />
        <FilterPill label="All" active={tab === "all"} onClick={() => setTab("all")} />
        <FilterPill label="Reports" active={tab === "reports"} onClick={() => setTab("reports")} />
      </div>

      {tab === "reports" ? (
        reports ? (
          <ExpenseCharts reports={reports} />
        ) : (
          <PageSkeleton />
        )
      ) : (
        <>
          {tab === "all" && (
            <div className="filter-bar flex-wrap mb-4">
              {(["All", ...categories] as const).map((category) => (
                <FilterPill
                  key={category}
                  label={category}
                  active={categoryFilter === category}
                  onClick={() => setCategoryFilter(category)}
                />
              ))}
              <input
                type="search"
                placeholder="Search voucher, description, requester…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field text-sm py-1.5 px-3 min-w-[220px]"
              />
            </div>
          )}

          <div className="surface-card overflow-hidden">
            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-sm text-zinc-400 text-center">
                {tab === "pending"
                  ? "No requests waiting for approval."
                  : tab === "awaiting-receipt"
                    ? "No cash out awaiting receipts."
                    : "No expenses recorded yet."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Voucher</th>
                      <th>Requester</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((expense) => (
                      <Fragment key={expense.id}>
                        <tr>
                          <td className="td-code">{expense.voucherNo}</td>
                          <td>{expense.requestedByName}</td>
                          <td>
                            <span className="inline-flex items-center gap-1.5">
                              {categoryIcon(expense.category)}
                              {expense.category}
                            </span>
                          </td>
                          <td className="max-w-xs truncate td-muted">{expense.description}</td>
                          <td className="td-num">
                            {formatCurrency(expense.actualAmount ?? expense.requestedAmount ?? 0)}
                          </td>
                          <td>
                            <StatusBadge status={expense.status} />
                          </td>
                          <td className="td-muted">{formatDate(expense.requestedAt)}</td>
                          <td className="text-right whitespace-nowrap">
                            {canManage && expense.status === "Requested" && (
                              <>
                                <button
                                  type="button"
                                  className="text-xs text-emerald-700 hover:underline mr-2"
                                  disabled={submitting}
                                  onClick={() => void handleApprove(expense.id)}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="text-xs text-red-600 hover:underline mr-2"
                                  disabled={submitting}
                                  onClick={() => {
                                    setRejectForId(expense.id);
                                    setRejectionReason("");
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {canManage && expense.status === "Approved" && (
                              <button
                                type="button"
                                className="text-xs text-blue-700 hover:underline"
                                disabled={submitting}
                                onClick={() => void handleDisburse(expense.id)}
                              >
                                Disburse
                              </button>
                            )}
                            {expense.status === "Disbursed" && (
                              <button
                                type="button"
                                className="text-xs text-blue-700 hover:underline"
                                disabled={submitting}
                                onClick={() => {
                                  setReceiptForId(expense.id);
                                  setReceiptAmount(
                                    expense.requestedAmount != null
                                      ? String(expense.requestedAmount)
                                      : "",
                                  );
                                  setReceiptVendor("");
                                  setReceiptUrl(undefined);
                                }}
                              >
                                Attach receipt
                              </button>
                            )}
                          </td>
                        </tr>
                        {rejectForId === expense.id && (
                          <tr>
                            <td colSpan={8} className="bg-zinc-50 px-5 py-3">
                              <div className="flex flex-wrap items-end gap-2">
                                <div className="flex-1 min-w-[200px]">
                                  <label className={labelClass}>Rejection reason</label>
                                  <input
                                    className={fieldClass}
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                  />
                                </div>
                                <button
                                  type="button"
                                  className="btn-primary px-3 py-2 text-sm"
                                  disabled={submitting}
                                  onClick={() => void handleReject(expense.id)}
                                >
                                  Confirm reject
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary px-3 py-2 text-sm"
                                  onClick={() => setRejectForId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {receiptForId === expense.id && (
                          <tr>
                            <td colSpan={8} className="bg-zinc-50 px-5 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className={labelClass}>Actual amount</label>
                                  <input
                                    className={fieldClass}
                                    value={receiptAmount}
                                    onChange={(e) => setReceiptAmount(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className={labelClass}>Vendor</label>
                                  <input
                                    className={fieldClass}
                                    value={receiptVendor}
                                    onChange={(e) => setReceiptVendor(e.target.value)}
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <MotifImageUpload
                                    imageUrl={receiptUrl}
                                    onChange={setReceiptUrl}
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <button
                                  type="button"
                                  className="btn-primary px-3 py-2 text-sm"
                                  disabled={submitting}
                                  onClick={() => void handleReceipt(expense.id)}
                                >
                                  Save receipt
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary px-3 py-2 text-sm"
                                  onClick={() => setReceiptForId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {expense.amountVarianceNote && expense.status === "Settled" && (
                          <tr>
                            <td colSpan={8} className="px-5 py-2 text-xs text-amber-700 bg-amber-50">
                              {expense.amountVarianceNote}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
