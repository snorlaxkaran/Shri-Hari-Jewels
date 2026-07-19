"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canManagePayroll, canViewPayroll } from "@/lib/auth/permissions";
import { fetchBranches } from "@/lib/api/branches";
import { fetchUsers } from "@/lib/api/users";
import {
  createEmployee,
  fetchEmployees,
  updateEmployee,
} from "@/lib/api/employees";
import { getApiErrorMessage } from "@/lib/api/client";
import type { AppUser, Branch, Employee } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

const emptyForm = {
  branchId: "",
  name: "",
  designation: "",
  dateOfJoining: new Date().toISOString().slice(0, 10),
  salaryType: "monthly" as "monthly" | "daily",
  monthlySalary: "",
  dailyWage: "",
  basicPercent: "50",
  hraPercent: "20",
  userId: "",
  bankAccountNo: "",
  bankIfsc: "",
  pfApplicable: false,
  esiApplicable: false,
  professionalTaxApplicable: false,
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const canView = user ? canViewPayroll(user.role) : false;
  const canManage = user ? canManagePayroll(user.role) : false;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showStatutory, setShowStatutory] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [emps, brs, usrs] = await Promise.all([
        fetchEmployees(),
        fetchBranches(),
        fetchUsers(),
      ]);
      setEmployees(emps);
      setBranches(brs.filter((b) => b.active));
      setUsers(usrs.filter((u) => u.active));
      if (brs.length > 0 && !form.branchId) {
        setForm((f) => ({ ...f, branchId: brs[0].id }));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load employees."));
    } finally {
      setLoading(false);
    }
  }, [form.branchId]);

  useEffect(() => {
    if (canView) void load();
    else setLoading(false);
  }, [canView, load]);

  const branchName = (id: string) =>
    branches.find((b) => b.id === id)?.name ?? "—";

  const startEdit = (emp: Employee) => {
    setEditId(emp.id);
    setShowForm(true);
    setShowStatutory(
      emp.pfApplicable || emp.esiApplicable || emp.professionalTaxApplicable,
    );
    setForm({
      branchId: emp.branchId,
      name: emp.name,
      designation: emp.designation,
      dateOfJoining: emp.dateOfJoining.slice(0, 10),
      salaryType: emp.monthlySalary != null ? "monthly" : "daily",
      monthlySalary: emp.monthlySalary?.toString() ?? "",
      dailyWage: emp.dailyWage?.toString() ?? "",
      basicPercent: String(emp.basicPercent),
      hraPercent: String(emp.hraPercent),
      userId: emp.userId ?? "",
      bankAccountNo: emp.bankAccountNo ?? "",
      bankIfsc: emp.bankIfsc ?? "",
      pfApplicable: emp.pfApplicable,
      esiApplicable: emp.esiApplicable,
      professionalTaxApplicable: emp.professionalTaxApplicable,
    });
  };

  const resetForm = () => {
    setEditId(null);
    setShowForm(false);
    setShowStatutory(false);
    setForm({
      ...emptyForm,
      branchId: branches[0]?.id ?? "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        branchId: form.branchId,
        name: form.name.trim(),
        designation: form.designation.trim(),
        dateOfJoining: form.dateOfJoining,
        userId: form.userId || undefined,
        basicPercent: Number(form.basicPercent),
        hraPercent: Number(form.hraPercent),
        bankAccountNo: form.bankAccountNo.trim() || undefined,
        bankIfsc: form.bankIfsc.trim() || undefined,
        pfApplicable: form.pfApplicable,
        esiApplicable: form.esiApplicable,
        professionalTaxApplicable: form.professionalTaxApplicable,
        ...(form.salaryType === "monthly"
          ? { monthlySalary: Number(form.monthlySalary), dailyWage: undefined }
          : { dailyWage: Number(form.dailyWage), monthlySalary: undefined }),
      };

      if (editId) {
        await updateEmployee(editId, payload);
      } else {
        await createEmployee(payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save employee."));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (emp: Employee) => {
    setError("");
    try {
      await updateEmployee(emp.id, { active: !emp.active });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update status."));
    }
  };

  if (loading) return <PageSkeleton />;

  if (!canView) {
    return (
      <div className="page-content">
        <PageHeader title="Employees" subtitle="Staff salary setup" />
        <div className="surface-card p-8 text-center text-sm text-zinc-400">
          You do not have access to employee records.
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Employees"
        subtitle="Fixed-salary and daily-wage staff (not piece-rate karigars)"
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => {
                if (showForm && !editId) resetForm();
                else {
                  setEditId(null);
                  setShowForm(true);
                }
              }}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              Add Employee
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {showForm && canManage && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="surface-card p-5 mb-6 grid gap-4"
        >
          <h3 className="text-sm font-semibold text-zinc-800">
            {editId ? "Edit Employee" : "New Employee"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Name</label>
              <input
                required
                className={fieldClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Designation</label>
              <input
                required
                className={fieldClass}
                value={form.designation}
                onChange={(e) =>
                  setForm({ ...form, designation: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Date of Joining</label>
              <input
                required
                type="date"
                className={fieldClass}
                value={form.dateOfJoining}
                onChange={(e) =>
                  setForm({ ...form, dateOfJoining: e.target.value })
                }
              />
            </div>
            {branches.length > 1 && (
              <div>
                <label className={labelClass}>Branch</label>
                <select
                  required
                  className={fieldClass}
                  value={form.branchId}
                  onChange={(e) =>
                    setForm({ ...form, branchId: e.target.value })
                  }
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelClass}>Salary Type</label>
              <select
                className={fieldClass}
                value={form.salaryType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    salaryType: e.target.value as "monthly" | "daily",
                  })
                }
              >
                <option value="monthly">Monthly Salary</option>
                <option value="daily">Daily Wage</option>
              </select>
            </div>
            {form.salaryType === "monthly" ? (
              <div>
                <label className={labelClass}>Monthly Salary (INR)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className={fieldClass}
                  value={form.monthlySalary}
                  onChange={(e) =>
                    setForm({ ...form, monthlySalary: e.target.value })
                  }
                />
              </div>
            ) : (
              <div>
                <label className={labelClass}>Daily Wage (INR)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className={fieldClass}
                  value={form.dailyWage}
                  onChange={(e) =>
                    setForm({ ...form, dailyWage: e.target.value })
                  }
                />
              </div>
            )}
            <div>
              <label className={labelClass}>Link to ERP User (optional)</label>
              <select
                className={fieldClass}
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
              >
                <option value="">No login — pantry/helpers</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Bank Account</label>
              <input
                className={fieldClass}
                value={form.bankAccountNo}
                onChange={(e) =>
                  setForm({ ...form, bankAccountNo: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass}>IFSC</label>
              <input
                className={fieldClass}
                value={form.bankIfsc}
                onChange={(e) => setForm({ ...form, bankIfsc: e.target.value })}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowStatutory((v) => !v)}
            className="text-xs text-zinc-500 hover:text-zinc-700 text-left"
          >
            {showStatutory ? "▾" : "▸"} Statutory Deductions (optional — confirm with CA)
          </button>

          {showStatutory && (
            <div className="flex flex-wrap gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.pfApplicable}
                  onChange={(e) =>
                    setForm({ ...form, pfApplicable: e.target.checked })
                  }
                />
                PF applicable
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.esiApplicable}
                  onChange={(e) =>
                    setForm({ ...form, esiApplicable: e.target.checked })
                  }
                />
                ESI applicable
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.professionalTaxApplicable}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      professionalTaxApplicable: e.target.checked,
                    })
                  }
                />
                Professional Tax
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {submitting ? "Saving…" : editId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="surface-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Designation</th>
              <th>Branch</th>
              <th className="text-right">Salary</th>
              <th>Joined</th>
              <th>Status</th>
              {canManage && <th />}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className={!emp.active ? "opacity-50" : ""}>
                <td className="font-medium">{emp.name}</td>
                <td className="td-muted">{emp.designation}</td>
                <td className="td-muted">{branchName(emp.branchId)}</td>
                <td className="td-num">
                  {emp.monthlySalary != null
                    ? formatCurrency(emp.monthlySalary) + "/mo"
                    : emp.dailyWage != null
                      ? formatCurrency(emp.dailyWage) + "/day"
                      : "—"}
                </td>
                <td className="td-muted">{formatDate(emp.dateOfJoining)}</td>
                <td>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      emp.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {emp.active ? "Active" : "Inactive"}
                  </span>
                </td>
                {canManage && (
                  <td className="text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(emp)}
                      className="text-xs text-blue-600 hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(emp)}
                      className="text-xs text-zinc-500 hover:underline"
                    >
                      {emp.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!employees.length && (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="text-center py-8 text-zinc-400">
                  No employees yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
