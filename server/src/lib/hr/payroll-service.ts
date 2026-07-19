import type { Employee as DbEmployee } from "@prisma/client";
import { prisma } from "../db.js";
import {
  toMoney,
  moneyToNumber,
  subtractMoney,
  sumMoney,
  multiplyMoney,
} from "../money.js";
import type {
  PayrollRun,
  UpdatePayslipItemInput,
  NewPayrollRunInput,
} from "../../types.js";
import {
  toPayrollRun,
  toPayslipItem,
  toApiAttendanceStatus,
} from "./mappers.js";
import {
  dateOnly,
  getDaysInMonth,
  summarizeAttendance,
} from "./attendance-service.js";
import { getShopSettings } from "../settings/service.js";
import { generatePayslipPdf } from "./payslip-pdf.js";

export class PayrollError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "PayrollError";
  }
}

/** Maharashtra-style default PT slab — confirm with client's CA. */
const DEFAULT_PROFESSIONAL_TAX = 200;

const PF_EMPLOYEE_RATE = 12;
const ESI_EMPLOYEE_RATE = 0.75;

type ComputedPayslip = {
  daysPresent: number;
  daysInMonth: number;
  lossOfPayDays: number;
  basicPay: number;
  hra: number;
  otherAllowances: number;
  grossPay: number;
  pfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  otherDeductions: number;
  netPay: number;
};

const computePayslipForEmployee = (
  employee: DbEmployee,
  year: number,
  month: number,
  attendanceRecords: Map<string, string | undefined>,
): ComputedPayslip => {
  const daysInMonth = getDaysInMonth(year, month);
  const statusMap = new Map<string, import("../../types.js").AttendanceStatus | undefined>();
  for (const [date, raw] of attendanceRecords) {
    statusMap.set(
      date,
      raw ? (raw as import("../../types.js").AttendanceStatus) : undefined,
    );
  }

  const summary = summarizeAttendance(statusMap, year, month);
  const { daysPresent, lossOfPayDays } = summary;

  const monthlySalary = employee.monthlySalary
    ? moneyToNumber(employee.monthlySalary)
    : null;
  const dailyWage = employee.dailyWage
    ? moneyToNumber(employee.dailyWage)
    : null;
  const basicPct = moneyToNumber(employee.basicPercent);
  const hraPct = moneyToNumber(employee.hraPercent);

  let fullGross: number;
  if (monthlySalary != null) {
    fullGross = monthlySalary;
  } else if (dailyWage != null) {
    fullGross = dailyWage * daysPresent;
  } else {
    fullGross = 0;
  }

  const lopFactor = subtractMoney(1, lossOfPayDays / daysInMonth);
  const earnedGross =
    monthlySalary != null
      ? multiplyMoney(fullGross, lopFactor).toNumber()
      : fullGross;

  const basicPay = multiplyMoney(earnedGross, basicPct / 100).toNumber();
  const hra = multiplyMoney(earnedGross, hraPct / 100).toNumber();
  const otherAllowances = subtractMoney(
    earnedGross,
    sumMoney([basicPay, hra]),
  ).toNumber();
  const grossPay = earnedGross;

  let pfDeduction = 0;
  let esiDeduction = 0;
  let professionalTax = 0;

  if (employee.pfApplicable) {
    pfDeduction = multiplyMoney(basicPay, PF_EMPLOYEE_RATE / 100).toNumber();
  }
  if (employee.esiApplicable) {
    esiDeduction = multiplyMoney(grossPay, ESI_EMPLOYEE_RATE / 100).toNumber();
  }
  if (employee.professionalTaxApplicable) {
    professionalTax = DEFAULT_PROFESSIONAL_TAX;
  }

  const otherDeductions = 0;
  const netPay = subtractMoney(
    grossPay,
    sumMoney([pfDeduction, esiDeduction, professionalTax, otherDeductions]),
  ).toNumber();

  return {
    daysPresent,
    daysInMonth,
    lossOfPayDays,
    basicPay,
    hra,
    otherAllowances,
    grossPay,
    pfDeduction,
    esiDeduction,
    professionalTax,
    otherDeductions,
    netPay,
  };
};

const getPayrollRunOrThrow = async (id: string, organizationId: string) => {
  const row = await prisma.payrollRun.findFirst({
    where: { id, organizationId },
    include: {
      items: { include: { employee: true } },
    },
  });
  if (!row) throw new PayrollError("Payroll run not found.", 404);
  return row;
};

export const listPayrollRuns = async (
  organizationId: string,
  branchId?: string,
): Promise<PayrollRun[]> => {
  const rows = await prisma.payrollRun.findMany({
    where: {
      organizationId,
      ...(branchId ? { branchId } : {}),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      items: { include: { employee: true } },
    },
  });
  return rows.map(toPayrollRun);
};

export const getPayrollRun = async (
  id: string,
  organizationId: string,
): Promise<PayrollRun> => {
  const row = await getPayrollRunOrThrow(id, organizationId);
  return toPayrollRun(row);
};

export const createPayrollRun = async (
  input: NewPayrollRunInput,
  organizationId: string,
  generatedByName: string,
): Promise<PayrollRun> => {
  const { month, year, branchId } = input;
  if (month < 1 || month > 12) {
    throw new PayrollError("Month must be between 1 and 12.");
  }

  const existing = await prisma.payrollRun.findUnique({
    where: {
      organizationId_branchId_month_year: {
        organizationId,
        branchId,
        month,
        year,
      },
    },
  });
  if (existing) {
    throw new PayrollError(
      "A payroll run already exists for this branch and month.",
      409,
    );
  }

  const employees = await prisma.employee.findMany({
    where: { organizationId, branchId, active: true },
  });

  const daysInMonth = getDaysInMonth(year, month);
  const from = dateOnly(year, month, 1);
  const to = dateOnly(year, month, daysInMonth);

  const attendanceRows = await prisma.attendanceRecord.findMany({
    where: {
      employee: { organizationId, branchId },
      date: { gte: from, lte: to },
    },
  });

  const attendanceByEmployee = new Map<string, Map<string, string>>();
  for (const row of attendanceRows) {
    if (!attendanceByEmployee.has(row.employeeId)) {
      attendanceByEmployee.set(row.employeeId, new Map());
    }
    const dateStr = row.date.toISOString().slice(0, 10);
    attendanceByEmployee
      .get(row.employeeId)!
      .set(dateStr, toApiAttendanceStatus(row.status));
  }

  const run = await prisma.$transaction(async (tx) => {
    const created = await tx.payrollRun.create({
      data: {
        organizationId,
        branchId,
        month,
        year,
        generatedByName,
        status: "Draft",
      },
    });

    for (const employee of employees) {
      const records = attendanceByEmployee.get(employee.id) ?? new Map();
      const computed = computePayslipForEmployee(
        employee,
        year,
        month,
        records,
      );

      await tx.payslipItem.create({
        data: {
          payrollRunId: created.id,
          employeeId: employee.id,
          daysPresent: toMoney(computed.daysPresent),
          daysInMonth: computed.daysInMonth,
          lossOfPayDays: toMoney(computed.lossOfPayDays),
          basicPay: toMoney(computed.basicPay),
          hra: toMoney(computed.hra),
          otherAllowances: toMoney(computed.otherAllowances),
          grossPay: toMoney(computed.grossPay),
          pfDeduction: toMoney(computed.pfDeduction),
          esiDeduction: toMoney(computed.esiDeduction),
          professionalTax: toMoney(computed.professionalTax),
          otherDeductions: toMoney(computed.otherDeductions),
          netPay: toMoney(computed.netPay),
        },
      });
    }

    return tx.payrollRun.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        items: { include: { employee: true } },
      },
    });
  });

  return toPayrollRun(run);
};

export const updatePayslipItem = async (
  payrollRunId: string,
  itemId: string,
  input: UpdatePayslipItemInput,
  organizationId: string,
): Promise<PayrollRun> => {
  const run = await getPayrollRunOrThrow(payrollRunId, organizationId);
  if (run.status !== "Draft") {
    throw new PayrollError("Only draft payroll runs can be edited.", 400);
  }

  const item = run.items.find((i) => i.id === itemId);
  if (!item) throw new PayrollError("Payslip item not found.", 404);

  const basicPay = input.basicPay ?? moneyToNumber(item.basicPay);
  const hra = input.hra ?? moneyToNumber(item.hra);
  const otherAllowances =
    input.otherAllowances ?? moneyToNumber(item.otherAllowances);
  const grossPay =
    input.grossPay ??
    sumMoney([basicPay, hra, otherAllowances]).toNumber();
  const pfDeduction = input.pfDeduction ?? moneyToNumber(item.pfDeduction);
  const esiDeduction = input.esiDeduction ?? moneyToNumber(item.esiDeduction);
  const professionalTax =
    input.professionalTax ?? moneyToNumber(item.professionalTax);
  const otherDeductions =
    input.otherDeductions ?? moneyToNumber(item.otherDeductions);
  const netPay =
    input.netPay ??
    subtractMoney(
      grossPay,
      sumMoney([
        pfDeduction,
        esiDeduction,
        professionalTax,
        otherDeductions,
      ]),
    ).toNumber();

  await prisma.payslipItem.update({
    where: { id: itemId },
    data: {
      ...(input.daysPresent !== undefined
        ? { daysPresent: toMoney(input.daysPresent) }
        : {}),
      ...(input.lossOfPayDays !== undefined
        ? { lossOfPayDays: toMoney(input.lossOfPayDays) }
        : {}),
      basicPay: toMoney(basicPay),
      hra: toMoney(hra),
      otherAllowances: toMoney(otherAllowances),
      grossPay: toMoney(grossPay),
      pfDeduction: toMoney(pfDeduction),
      esiDeduction: toMoney(esiDeduction),
      professionalTax: toMoney(professionalTax),
      otherDeductions: toMoney(otherDeductions),
      netPay: toMoney(netPay),
    },
  });

  return getPayrollRun(payrollRunId, organizationId);
};

export const finalizePayrollRun = async (
  id: string,
  organizationId: string,
): Promise<PayrollRun> => {
  const run = await getPayrollRunOrThrow(id, organizationId);
  if (run.status !== "Draft") {
    throw new PayrollError("Only draft runs can be finalized.", 400);
  }

  const updated = await prisma.payrollRun.update({
    where: { id },
    data: {
      status: "Finalized",
      finalizedAt: new Date(),
    },
    include: {
      items: { include: { employee: true } },
    },
  });

  return toPayrollRun(updated);
};

export const markPayrollRunPaid = async (
  id: string,
  organizationId: string,
): Promise<PayrollRun> => {
  const run = await getPayrollRunOrThrow(id, organizationId);
  if (run.status !== "Finalized") {
    throw new PayrollError("Only finalized runs can be marked as paid.", 400);
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    await tx.payslipItem.updateMany({
      where: { payrollRunId: id },
      data: { paidAt: now },
    });
    return tx.payrollRun.update({
      where: { id },
      data: { status: "Paid", paidAt: now },
      include: {
        items: { include: { employee: true } },
      },
    });
  });

  return toPayrollRun(updated);
};

export const getPayslipPdfBuffer = async (
  payrollRunId: string,
  itemId: string,
  organizationId: string,
): Promise<Buffer> => {
  const run = await getPayrollRunOrThrow(payrollRunId, organizationId);
  const item = run.items.find((i) => i.id === itemId);
  if (!item || !item.employee) {
    throw new PayrollError("Payslip not found.", 404);
  }

  const settings = await getShopSettings(organizationId);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return generatePayslipPdf({
    settings,
    employee: item.employee,
    payslip: toPayslipItem(item),
    periodLabel: `${monthNames[run.month - 1]} ${run.year}`,
    runStatus: run.status,
  });
};

export type PayrollAttendancePreview = {
  employeeId: string;
  employeeName: string;
  daysPresent: number;
  daysAbsent: number;
  daysLeave: number;
  lossOfPayDays: number;
  unmarkedWeekdays: number;
  incomplete: boolean;
};

export const getPayrollAttendancePreview = async (
  organizationId: string,
  branchId: string,
  month: number,
  year: number,
): Promise<PayrollAttendancePreview[]> => {
  const employees = await prisma.employee.findMany({
    where: { organizationId, branchId, active: true },
    orderBy: { name: "asc" },
  });

  const daysInMonth = getDaysInMonth(year, month);
  const from = dateOnly(year, month, 1);
  const to = dateOnly(year, month, daysInMonth);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      employee: { organizationId, branchId },
      date: { gte: from, lte: to },
    },
  });

  const byEmployee = new Map<string, Map<string, import("../../types.js").AttendanceStatus>>();
  for (const r of records) {
    if (!byEmployee.has(r.employeeId)) {
      byEmployee.set(r.employeeId, new Map());
    }
    byEmployee
      .get(r.employeeId)!
      .set(r.date.toISOString().slice(0, 10), toApiAttendanceStatus(r.status));
  }

  return employees.map((emp) => {
    const map = byEmployee.get(emp.id) ?? new Map();
    const summary = summarizeAttendance(map, year, month);
    return {
      employeeId: emp.id,
      employeeName: emp.name,
      daysPresent: summary.daysPresent,
      daysAbsent: summary.daysAbsent,
      daysLeave: summary.daysLeave,
      lossOfPayDays: summary.lossOfPayDays,
      unmarkedWeekdays: summary.unmarkedWeekdays,
      incomplete: summary.incomplete,
    };
  });
};
