import type {
  AttendanceStatus as DbAttendanceStatus,
  Employee as DbEmployee,
  AttendanceRecord as DbAttendanceRecord,
  PayrollRun as DbPayrollRun,
  PayslipItem as DbPayslipItem,
  PayrollRunStatus as DbPayrollRunStatus,
} from "@prisma/client";
import type {
  AttendanceStatus,
  Employee,
  AttendanceRecord,
  PayrollRun,
  PayslipItem,
  PayrollRunStatus,
} from "../../types.js";
import { moneyToNumber } from "../money.js";

const DB_TO_API_ATTENDANCE: Record<DbAttendanceStatus, AttendanceStatus> = {
  Present: "Present",
  Absent: "Absent",
  HalfDay: "Half Day",
  Leave: "Leave",
  Holiday: "Holiday",
  WeekOff: "Week Off",
};

export const toApiAttendanceStatus = (
  status: DbAttendanceStatus,
): AttendanceStatus => DB_TO_API_ATTENDANCE[status];

export const toDbAttendanceStatus = (
  status: AttendanceStatus,
): DbAttendanceStatus => {
  const map: Record<AttendanceStatus, DbAttendanceStatus> = {
    Present: "Present",
    Absent: "Absent",
    "Half Day": "HalfDay",
    Leave: "Leave",
    Holiday: "Holiday",
    "Week Off": "WeekOff",
  };
  return map[status];
};

const DB_TO_API_PAYROLL_STATUS: Record<DbPayrollRunStatus, PayrollRunStatus> = {
  Draft: "Draft",
  Finalized: "Finalized",
  Paid: "Paid",
};

export const toApiPayrollRunStatus = (
  status: DbPayrollRunStatus,
): PayrollRunStatus => DB_TO_API_PAYROLL_STATUS[status];

export const toDbPayrollRunStatus = (
  status: PayrollRunStatus,
): DbPayrollRunStatus => {
  const map: Record<PayrollRunStatus, DbPayrollRunStatus> = {
    Draft: "Draft",
    Finalized: "Finalized",
    Paid: "Paid",
  };
  return map[status];
};

export const toEmployee = (row: DbEmployee): Employee => ({
  id: row.id,
  organizationId: row.organizationId,
  branchId: row.branchId,
  userId: row.userId ?? undefined,
  name: row.name,
  designation: row.designation,
  dateOfJoining: row.dateOfJoining.toISOString(),
  active: row.active,
  monthlySalary: row.monthlySalary ? moneyToNumber(row.monthlySalary) : undefined,
  dailyWage: row.dailyWage ? moneyToNumber(row.dailyWage) : undefined,
  basicPercent: moneyToNumber(row.basicPercent),
  hraPercent: moneyToNumber(row.hraPercent),
  pfApplicable: row.pfApplicable,
  esiApplicable: row.esiApplicable,
  professionalTaxApplicable: row.professionalTaxApplicable,
  bankAccountNo: row.bankAccountNo ?? undefined,
  bankIfsc: row.bankIfsc ?? undefined,
  createdAt: row.createdAt.toISOString(),
});

export const toAttendanceRecord = (row: DbAttendanceRecord): AttendanceRecord => ({
  id: row.id,
  employeeId: row.employeeId,
  date: row.date.toISOString().slice(0, 10),
  status: toApiAttendanceStatus(row.status),
  markedByName: row.markedByName,
  notes: row.notes ?? undefined,
  createdAt: row.createdAt.toISOString(),
});

export const toPayslipItem = (
  row: DbPayslipItem & { employee?: DbEmployee },
): PayslipItem => ({
  id: row.id,
  payrollRunId: row.payrollRunId,
  employeeId: row.employeeId,
  employeeName: row.employee?.name,
  daysPresent: moneyToNumber(row.daysPresent),
  daysInMonth: row.daysInMonth,
  lossOfPayDays: moneyToNumber(row.lossOfPayDays),
  basicPay: moneyToNumber(row.basicPay),
  hra: moneyToNumber(row.hra),
  otherAllowances: moneyToNumber(row.otherAllowances),
  grossPay: moneyToNumber(row.grossPay),
  pfDeduction: moneyToNumber(row.pfDeduction),
  esiDeduction: moneyToNumber(row.esiDeduction),
  professionalTax: moneyToNumber(row.professionalTax),
  otherDeductions: moneyToNumber(row.otherDeductions),
  netPay: moneyToNumber(row.netPay),
  paidAt: row.paidAt?.toISOString(),
});

export const toPayrollRun = (
  row: DbPayrollRun & { items?: (DbPayslipItem & { employee?: DbEmployee })[] },
): PayrollRun => ({
  id: row.id,
  organizationId: row.organizationId,
  branchId: row.branchId,
  month: row.month,
  year: row.year,
  status: toApiPayrollRunStatus(row.status),
  generatedByName: row.generatedByName,
  finalizedAt: row.finalizedAt?.toISOString(),
  paidAt: row.paidAt?.toISOString(),
  createdAt: row.createdAt.toISOString(),
  items: row.items?.map(toPayslipItem),
});
