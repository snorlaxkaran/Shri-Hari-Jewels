import type { AttendanceStatus as DbAttendanceStatus } from "@prisma/client";
import { prisma } from "../db.js";
import type {
  AttendanceGrid,
  AttendanceRecord,
  AttendanceStatus,
  MarkAttendanceInput,
  BulkMarkAttendanceInput,
} from "../../types.js";
import { toAttendanceRecord, toDbAttendanceStatus } from "./mappers.js";
import { getEmployeeOrThrow } from "./employee-service.js";

export class AttendanceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "AttendanceError";
  }
}

const dateOnly = (year: number, month: number, day: number): Date =>
  new Date(Date.UTC(year, month - 1, day));

const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

const isWeekend = (year: number, month: number, day: number): boolean => {
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 || dow === 6;
};

export const getAttendanceGrid = async (
  organizationId: string,
  branchId: string,
  month: number,
  year: number,
): Promise<AttendanceGrid> => {
  const daysInMonth = getDaysInMonth(year, month);
  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(
      dateOnly(year, month, d).toISOString().slice(0, 10),
    );
  }

  const employees = await prisma.employee.findMany({
    where: { organizationId, branchId, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, designation: true, userId: true },
  });

  const from = dateOnly(year, month, 1);
  const to = dateOnly(year, month, daysInMonth);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      employee: { organizationId, branchId },
      date: { gte: from, lte: to },
    },
  });

  const recordMap = new Map<string, DbAttendanceStatus>();
  for (const r of records) {
    const key = `${r.employeeId}|${r.date.toISOString().slice(0, 10)}`;
    recordMap.set(key, r.status);
  }

  return {
    month,
    year,
    branchId,
    dates,
    employees: employees.map((e) => ({
      id: e.id,
      name: e.name,
      designation: e.designation,
      userId: e.userId ?? undefined,
      days: dates.map((date) => {
        const status = recordMap.get(`${e.id}|${date}`);
        return { date, status: status ? toAttendanceRecord({
          id: "",
          employeeId: e.id,
          date: new Date(date),
          status,
          markedByName: "",
          notes: null,
          createdAt: new Date(),
        }).status : undefined };
      }),
    })),
  };
};

export const markAttendance = async (
  input: MarkAttendanceInput,
  organizationId: string,
  markedByName: string,
  actingUserId?: string,
): Promise<AttendanceRecord | null> => {
  const employee = await getEmployeeOrThrow(input.employeeId, organizationId);

  if (actingUserId && employee.userId && employee.userId !== actingUserId) {
    throw new AttendanceError(
      "You can only mark your own attendance unless you are an admin.",
      403,
    );
  }

  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    throw new AttendanceError("Invalid date.");
  }

  if (!input.status) {
    await prisma.attendanceRecord.deleteMany({
      where: {
        employeeId: input.employeeId,
        date: dateOnly(
          date.getUTCFullYear(),
          date.getUTCMonth() + 1,
          date.getUTCDate(),
        ),
      },
    });
    return null;
  }

  const dateKey = dateOnly(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );

  const row = await prisma.attendanceRecord.upsert({
    where: {
      employeeId_date: {
        employeeId: input.employeeId,
        date: dateKey,
      },
    },
    create: {
      employeeId: input.employeeId,
      date: dateKey,
      status: toDbAttendanceStatus(input.status),
      markedByName,
      notes: input.notes?.trim() || null,
    },
    update: {
      status: toDbAttendanceStatus(input.status),
      markedByName,
      notes: input.notes?.trim() || null,
    },
  });

  return toAttendanceRecord(row);
};

export const bulkMarkAttendance = async (
  input: BulkMarkAttendanceInput,
  organizationId: string,
  markedByName: string,
): Promise<number> => {
  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    throw new AttendanceError("Invalid date.");
  }
  if (!input.status) {
    throw new AttendanceError("Status is required for bulk mark.");
  }

  const dateKey = dateOnly(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );

  const employees = await prisma.employee.findMany({
    where: {
      organizationId,
      id: { in: input.employeeIds },
      active: true,
    },
    select: { id: true },
  });

  if (employees.length === 0) {
    throw new AttendanceError("No valid employees found.");
  }

  const dbStatus = toDbAttendanceStatus(input.status);
  let count = 0;
  for (const emp of employees) {
    await prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: { employeeId: emp.id, date: dateKey },
      },
      create: {
        employeeId: emp.id,
        date: dateKey,
        status: dbStatus,
        markedByName,
      },
      update: {
        status: dbStatus,
        markedByName,
      },
    });
    count++;
  }
  return count;
};

export type AttendanceSummary = {
  employeeId: string;
  daysPresent: number;
  daysAbsent: number;
  daysLeave: number;
  daysHalfDay: number;
  lossOfPayDays: number;
  unmarkedWeekdays: number;
  incomplete: boolean;
};

/** Default: earned leave is paid. Confirm with client's HR policy. */
export const PAID_LEAVE_COUNTS_AS_PRESENT = true;

export const summarizeAttendance = (
  records: Map<string, AttendanceStatus | undefined>,
  year: number,
  month: number,
): AttendanceSummary => {
  const daysInMonth = getDaysInMonth(year, month);
  let daysPresent = 0;
  let daysAbsent = 0;
  let daysLeave = 0;
  let daysHalfDay = 0;
  let lossOfPayDays = 0;
  let unmarkedWeekdays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = dateOnly(year, month, d).toISOString().slice(0, 10);
    const status = records.get(dateStr);
    const weekend = isWeekend(year, month, d);

    if (!status) {
      if (!weekend) {
        unmarkedWeekdays++;
        lossOfPayDays += 1;
      }
      continue;
    }

    switch (status) {
      case "Present":
        daysPresent += 1;
        break;
      case "Half Day":
        daysHalfDay += 1;
        daysPresent += 0.5;
        lossOfPayDays += 0.5;
        break;
      case "Absent":
        daysAbsent += 1;
        lossOfPayDays += 1;
        break;
      case "Leave":
        daysLeave += 1;
        if (PAID_LEAVE_COUNTS_AS_PRESENT) {
          daysPresent += 1;
        } else {
          lossOfPayDays += 1;
        }
        break;
      case "Holiday":
      case "Week Off":
        daysPresent += 1;
        break;
      default:
        break;
    }
  }

  return {
    employeeId: "",
    daysPresent,
    daysAbsent,
    daysLeave,
    daysHalfDay,
    lossOfPayDays,
    unmarkedWeekdays,
    incomplete: unmarkedWeekdays > 0,
  };
};

export { isWeekend, getDaysInMonth, dateOnly };
