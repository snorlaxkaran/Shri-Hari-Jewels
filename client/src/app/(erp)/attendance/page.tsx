"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canManagePayroll, canViewPayroll } from "@/lib/auth/permissions";
import { fetchBranches } from "@/lib/api/branches";
import {
  bulkMarkAttendance,
  fetchAttendanceGrid,
  markAttendance,
} from "@/lib/api/attendance";
import { getApiErrorMessage } from "@/lib/api/client";
import type { AttendanceGrid, AttendanceStatus, Branch } from "@/lib/types";

const STATUS_CYCLE: (AttendanceStatus | null)[] = [
  null,
  "Present",
  "Absent",
  "Half Day",
  "Leave",
];

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  Present: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Absent: "bg-red-100 text-red-800 border-red-200",
  "Half Day": "bg-amber-100 text-amber-800 border-amber-200",
  Leave: "bg-blue-100 text-blue-800 border-blue-200",
  Holiday: "bg-purple-100 text-purple-800 border-purple-200",
  "Week Off": "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const STATUS_SHORT: Record<AttendanceStatus, string> = {
  Present: "P",
  Absent: "A",
  "Half Day": "½",
  Leave: "L",
  Holiday: "H",
  "Week Off": "W",
};

const fieldClass = "filter-select px-3 py-2 text-sm";

export default function AttendancePage() {
  const { user } = useAuth();
  const canView = user ? canViewPayroll(user.role) : false;
  const canManage = user ? canManagePayroll(user.role) : false;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [grid, setGrid] = useState<AttendanceGrid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState(false);

  const todayStr = useMemo(
    () => new Date().toISOString().slice(0, 10),
    [],
  );

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    void fetchBranches()
      .then((b) => {
        setBranches(b.filter((x) => x.active));
        if (b.length > 0 && !branchId) {
          setBranchId(b[0].id);
        }
      })
      .catch(() => setError("Could not load branches."));
  }, [canView, branchId]);

  const load = useCallback(async () => {
    if (!branchId) return;
    setError("");
    setLoading(true);
    try {
      setGrid(
        await fetchAttendanceGrid({ month, year, branchId }),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load attendance."));
    } finally {
      setLoading(false);
    }
  }, [branchId, month, year]);

  useEffect(() => {
    if (canView && branchId) void load();
  }, [canView, branchId, load]);

  const shiftMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  const handleCellClick = async (
    employeeId: string,
    date: string,
    current?: AttendanceStatus,
  ) => {
    if (!canManage) return;
    const idx = STATUS_CYCLE.indexOf(current ?? null);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];

    setMarking(true);
    try {
      await markAttendance({
        employeeId,
        date,
        status: next,
      });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to mark attendance."));
    } finally {
      setMarking(false);
    }
  };

  const handleMarkAllPresentToday = async () => {
    if (!grid || !canManage) return;
    setMarking(true);
    setError("");
    try {
      await bulkMarkAttendance({
        date: todayStr,
        employeeIds: grid.employees.map((e) => e.id),
        status: "Present",
      });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to bulk mark."));
    } finally {
      setMarking(false);
    }
  };

  if (!canView) {
    return (
      <div className="page-content">
        <PageHeader title="Attendance" subtitle="Daily staff attendance register" />
        <div className="surface-card p-8 text-center text-sm text-zinc-400">
          You do not have access to attendance.
        </div>
      </div>
    );
  }

  if (loading && !grid) return <PageSkeleton />;

  const monthLabel = new Date(year, month - 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="page-content">
      <PageHeader
        title="Attendance"
        subtitle="Click cells to cycle status — blank → Present → Absent → Half Day → Leave"
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => void handleMarkAllPresentToday()}
              disabled={marking || !grid?.employees.length}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              Mark All Present — Today
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="filter-bar mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="btn-secondary p-2"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium min-w-[140px] text-center">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="btn-secondary p-2"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>

        {branches.length > 1 && (
          <select
            className={fieldClass}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <div className="flex flex-wrap gap-2 ml-auto text-xs">
          {(["Present", "Absent", "Half Day", "Leave"] as AttendanceStatus[]).map(
            (s) => (
              <span
                key={s}
                className={`px-2 py-0.5 rounded border ${STATUS_COLORS[s]}`}
              >
                {s}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="surface-card overflow-auto">
        <table className="text-xs border-collapse min-w-max w-full">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="sticky left-0 z-20 bg-zinc-50 px-3 py-2 text-left font-medium text-zinc-600 min-w-[160px]">
                Employee
              </th>
              {grid?.dates.map((date) => {
                const isToday = date === todayStr;
                const dayNum = date.slice(8, 10);
                const dow = new Date(date).toLocaleDateString("en-IN", {
                  weekday: "short",
                });
                return (
                  <th
                    key={date}
                    className={`px-1 py-2 text-center font-medium min-w-[36px] ${
                      isToday
                        ? "bg-amber-50 text-amber-900 border-x border-amber-200"
                        : "text-zinc-500"
                    }`}
                  >
                    <div>{dayNum}</div>
                    <div className="text-[10px] font-normal">{dow}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {grid?.employees.map((emp) => (
              <tr key={emp.id} className="border-b border-zinc-100">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-zinc-100">
                  <div className="font-medium text-zinc-800">{emp.name}</div>
                  <div className="text-[10px] text-zinc-400">{emp.designation}</div>
                </td>
                {emp.days.map(({ date, status }) => {
                  const isToday = date === todayStr;
                  return (
                    <td
                      key={date}
                      className={`p-0.5 text-center ${isToday ? "bg-amber-50/60" : ""}`}
                    >
                      <button
                        type="button"
                        disabled={!canManage || marking}
                        onClick={() =>
                          void handleCellClick(emp.id, date, status)
                        }
                        title={status ?? "Unmarked"}
                        className={`w-8 h-8 rounded border text-[11px] font-semibold transition-colors disabled:cursor-default ${
                          status
                            ? STATUS_COLORS[status]
                            : "border-zinc-200 bg-white hover:bg-zinc-50 text-transparent"
                        } ${canManage && !status ? "hover:text-zinc-300" : ""}`}
                      >
                        {status ? STATUS_SHORT[status] : "·"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {!grid?.employees.length && (
              <tr>
                <td
                  colSpan={(grid?.dates.length ?? 0) + 1}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  No active employees for this branch. Add staff under Employees first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
