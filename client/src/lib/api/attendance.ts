import type { AttendanceGrid, AttendanceStatus } from "@/lib/types";
import { api } from "./client";

export const fetchAttendanceGrid = async (params: {
  month: number;
  year: number;
  branchId: string;
}): Promise<AttendanceGrid> => {
  const { data } = await api.get<AttendanceGrid>("/api/attendance", {
    params,
  });
  return data;
};

export const markAttendance = async (input: {
  employeeId: string;
  date: string;
  status?: AttendanceStatus | null;
}): Promise<void> => {
  await api.post("/api/attendance/mark", input);
};

export const bulkMarkAttendance = async (input: {
  date: string;
  employeeIds: string[];
  status: AttendanceStatus;
}): Promise<{ count: number }> => {
  const { data } = await api.post<{ count: number }>(
    "/api/attendance/bulk-mark",
    input,
  );
  return data;
};
