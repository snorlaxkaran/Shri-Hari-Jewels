"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchMyEmployeeRecord } from "@/lib/api/employees";
import { markAttendance } from "@/lib/api/attendance";
import { getApiErrorMessage } from "@/lib/api/client";
import type { AttendanceStatus, Employee } from "@/lib/types";

const OPTIONS: AttendanceStatus[] = [
  "Present",
  "Absent",
  "Half Day",
  "Leave",
];

export default function AttendanceSelfMark() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    try {
      setEmployee(await fetchMyEmployeeRecord());
    } catch {
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMark = async (status: AttendanceStatus) => {
    if (!employee) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await markAttendance({
        employeeId: employee.id,
        date: today,
        status,
      });
      setMessage(`Marked ${status} for today.`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not mark attendance."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !employee) return null;

  return (
    <div className="surface-card p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800">My Attendance</h3>
          <p className="text-xs text-zinc-500">
            Mark today ({today}) — admin can override in{" "}
            <Link href="/attendance" className="text-blue-600 hover:underline">
              Attendance
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              disabled={submitting}
              onClick={() => void handleMark(status)}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      {message && (
        <p className="mt-2 text-xs text-emerald-700">{message}</p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
