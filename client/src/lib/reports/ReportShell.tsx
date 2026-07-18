"use client";

import { Download, FileSpreadsheet, Mail } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchBranches } from "@/lib/api/branches";
import { fetchCustomers } from "@/lib/api/customers";
import { downloadReportPdf, emailReport } from "@/lib/api/reports";
import { getApiErrorMessage } from "@/lib/api/client";
import { PRODUCT_CATEGORIES } from "@/lib/inventory/categories";
import { STOCK_FORM_METALS } from "@/lib/inventory/stock-import";
import { exportToExcel } from "@/lib/reports/excel";
import type {
  ReportExportData,
  ReportFilterKey,
  ReportFilters,
} from "@/lib/reports/types";
import type { Branch, Customer } from "@/lib/types";

const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";
const fieldClass = "input-field w-full px-3 py-2 text-sm";

const defaultMonthRange = (): { from: string; to: string } => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
};

export type ReportShellProps = {
  title: string;
  reportKey: string;
  filters?: ReportFilterKey[];
  exportData: ReportExportData;
  filtersState?: ReportFilters;
  onFiltersChange?: (filters: ReportFilters) => void;
  loading?: boolean;
  children: React.ReactNode;
};

export default function ReportShell({
  title,
  reportKey,
  filters: enabledFilters = [],
  exportData,
  filtersState,
  onFiltersChange,
  loading = false,
  children,
}: ReportShellProps) {
  const monthDefaults = useMemo(() => defaultMonthRange(), []);
  const [internalFilters, setInternalFilters] = useState<ReportFilters>({
    from: monthDefaults.from,
    to: monthDefaults.to,
  });
  const filters = filtersState ?? internalFilters;

  const setFilters = useCallback(
    (patch: Partial<ReportFilters>) => {
      const next = { ...filters, ...patch };
      if (onFiltersChange) onFiltersChange(next);
      else setInternalFilters(next);
    },
    [filters, onFiltersChange],
  );

  const [branches, setBranches] = useState<Branch[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailError, setEmailError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!enabledFilters.includes("branch")) return;
    fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [enabledFilters]);

  useEffect(() => {
    if (!enabledFilters.includes("customer")) return;
    if (customerQuery.trim().length < 2) {
      setCustomerOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setCustomerLoading(true);
      try {
        const results = await fetchCustomers(customerQuery.trim());
        setCustomerOptions(results.slice(0, 8));
      } catch {
        setCustomerOptions([]);
      } finally {
        setCustomerLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerQuery, enabledFilters]);

  const selectedCustomer = customerOptions.find((c) => c.id === filters.customerId);

  const handleExportExcel = () => {
    exportToExcel(exportData.filename, exportData.headers, exportData.rows);
  };

  const handleExportPdf = async () => {
    setExporting("pdf");
    setActionMessage("");
    setActionError("");
    try {
      await downloadReportPdf(reportKey, filters, `${exportData.filename}.pdf`);
      setActionMessage("PDF downloaded successfully.");
    } catch (err) {
      setActionError(getApiErrorMessage(err, "PDF export failed."));
    } finally {
      setExporting(null);
    }
  };

  const handleEmail = async () => {
    setEmailError("");
    setExporting("email");
    setActionMessage("");
    setActionError("");
    try {
      await emailReport(reportKey, emailTo.trim(), filters);
      setActionMessage("Report emailed successfully.");
      setEmailOpen(false);
      setEmailTo("");
    } catch (err) {
      setEmailError(getApiErrorMessage(err, "Failed to email report."));
    } finally {
      setExporting(null);
    }
  };

  const showFilters = enabledFilters.length > 0;

  return (
    <div className="page-content space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1.5 text-sm"
            onClick={handleExportExcel}
            disabled={loading || exportData.rows.length === 0}
          >
            <FileSpreadsheet size={15} />
            Export Excel
          </button>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1.5 text-sm"
            onClick={() => void handleExportPdf()}
            disabled={loading || exporting === "pdf"}
          >
            <Download size={15} />
            Export PDF (A4)
          </button>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1.5 text-sm"
            onClick={() => setEmailOpen(true)}
            disabled={loading}
          >
            <Mail size={15} />
            Email Report
          </button>
        </div>
      </div>

      {actionMessage && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {actionMessage}
        </p>
      )}

      {actionError && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {actionError}
        </p>
      )}

      {showFilters && (
        <div className="surface-card rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {enabledFilters.includes("branch") && branches.length > 1 && (
            <div>
              <label className={labelClass}>Branch / Location</label>
              <select
                className={fieldClass}
                value={filters.branchId ?? ""}
                onChange={(e) =>
                  setFilters({ branchId: e.target.value || undefined })
                }
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {enabledFilters.includes("category") && (
            <div>
              <label className={labelClass}>Category</label>
              <select
                className={fieldClass}
                value={filters.category ?? ""}
                onChange={(e) =>
                  setFilters({ category: e.target.value || undefined })
                }
              >
                <option value="">All categories</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {enabledFilters.includes("department") && (
            <div>
              <label className={labelClass}>Department (Metal)</label>
              <select
                className={fieldClass}
                value={filters.department ?? ""}
                onChange={(e) =>
                  setFilters({ department: e.target.value || undefined })
                }
              >
                <option value="">All departments</option>
                {STOCK_FORM_METALS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {enabledFilters.includes("customer") && (
            <div className="relative sm:col-span-2">
              <label className={labelClass}>Customer</label>
              <input
                type="text"
                className={fieldClass}
                placeholder="Search customer…"
                value={
                  selectedCustomer
                    ? `${selectedCustomer.name} (${selectedCustomer.mobile})`
                    : customerQuery
                }
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  if (filters.customerId) setFilters({ customerId: undefined });
                }}
              />
              {customerQuery.length >= 2 && !filters.customerId && (
                <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
                  {customerLoading ? (
                    <li className="px-3 py-2 text-sm text-zinc-400">Searching…</li>
                  ) : customerOptions.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-zinc-400">No customers found</li>
                  ) : (
                    customerOptions.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50"
                          onClick={() => {
                            setFilters({ customerId: c.id });
                            setCustomerQuery("");
                          }}
                        >
                          {c.name} · {c.mobile}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
              {filters.customerId && (
                <button
                  type="button"
                  className="text-xs text-zinc-500 mt-1 hover:text-zinc-800"
                  onClick={() => setFilters({ customerId: undefined })}
                >
                  Clear customer filter
                </button>
              )}
            </div>
          )}

          {enabledFilters.includes("dateRange") && (
            <>
              <div>
                <label className={labelClass}>From</label>
                <input
                  type="date"
                  className={fieldClass}
                  value={filters.from ?? monthDefaults.from}
                  onChange={(e) => setFilters({ from: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>To</label>
                <input
                  type="date"
                  className={fieldClass}
                  value={filters.to ?? monthDefaults.to}
                  onChange={(e) => setFilters({ to: e.target.value })}
                />
              </div>
            </>
          )}

          {enabledFilters.includes("groupBySku") && (
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700 pb-2">
                <input
                  type="checkbox"
                  checked={Boolean(filters.groupBySku)}
                  onChange={(e) => setFilters({ groupBySku: e.target.checked })}
                />
                Group by SKU
              </label>
            </div>
          )}
        </div>
      )}

      {loading ? <p className="text-sm text-zinc-500">Loading report…</p> : children}

      {emailOpen && (
        <div className="modal-overlay">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            style={{ background: "transparent", border: "none" }}
            onClick={() => !exporting && setEmailOpen(false)}
            aria-label="Close"
          />
          <div className="modal-panel relative z-10 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Email Report</h2>
            <p className="text-sm text-zinc-500">
              A PDF copy of <strong>{exportData.title}</strong> will be sent to the recipient.
            </p>
            <div>
              <label className={labelClass}>Recipient email</label>
              <input
                type="email"
                className={fieldClass}
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            {emailError && (
              <p className="text-sm text-red-600">{emailError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEmailOpen(false)}
                disabled={exporting === "email"}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleEmail()}
                disabled={exporting === "email" || !emailTo.includes("@")}
              >
                {exporting === "email" ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { defaultMonthRange };
