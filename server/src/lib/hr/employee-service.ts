import { prisma } from "../db.js";
import { toMoney } from "../money.js";
import type { Employee, NewEmployeeInput, UpdateEmployeeInput } from "../../types.js";
import { toEmployee } from "./mappers.js";

export class EmployeeError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "EmployeeError";
  }
}

const validateSalaryFields = (input: {
  monthlySalary?: number;
  dailyWage?: number;
}) => {
  const hasMonthly = input.monthlySalary != null && input.monthlySalary > 0;
  const hasDaily = input.dailyWage != null && input.dailyWage > 0;
  if (!hasMonthly && !hasDaily) {
    throw new EmployeeError("Either monthly salary or daily wage is required.");
  }
  if (hasMonthly && hasDaily) {
    throw new EmployeeError("Set either monthly salary or daily wage, not both.");
  }
};

export const listEmployees = async (
  organizationId: string,
  branchId?: string,
): Promise<Employee[]> => {
  const rows = await prisma.employee.findMany({
    where: {
      organizationId,
      ...(branchId ? { branchId } : {}),
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return rows.map(toEmployee);
};

export const getEmployeeOrThrow = async (
  id: string,
  organizationId: string,
) => {
  const row = await prisma.employee.findFirst({
    where: { id, organizationId },
  });
  if (!row) throw new EmployeeError("Employee not found.", 404);
  return row;
};

export const createEmployee = async (
  input: NewEmployeeInput,
  organizationId: string,
): Promise<Employee> => {
  validateSalaryFields(input);

  if (input.userId) {
    const existing = await prisma.employee.findUnique({
      where: { userId: input.userId },
    });
    if (existing) {
      throw new EmployeeError("This user is already linked to an employee record.");
    }
  }

  const row = await prisma.employee.create({
    data: {
      organizationId,
      branchId: input.branchId,
      userId: input.userId ?? null,
      name: input.name.trim(),
      designation: input.designation.trim(),
      dateOfJoining: new Date(input.dateOfJoining),
      active: input.active ?? true,
      monthlySalary:
        input.monthlySalary != null ? toMoney(input.monthlySalary) : null,
      dailyWage: input.dailyWage != null ? toMoney(input.dailyWage) : null,
      basicPercent: toMoney(input.basicPercent ?? 50),
      hraPercent: toMoney(input.hraPercent ?? 20),
      pfApplicable: input.pfApplicable ?? false,
      esiApplicable: input.esiApplicable ?? false,
      professionalTaxApplicable: input.professionalTaxApplicable ?? false,
      bankAccountNo: input.bankAccountNo?.trim() || null,
      bankIfsc: input.bankIfsc?.trim() || null,
    },
  });
  return toEmployee(row);
};

export const updateEmployee = async (
  id: string,
  input: UpdateEmployeeInput,
  organizationId: string,
): Promise<Employee> => {
  const existing = await getEmployeeOrThrow(id, organizationId);

  const merged = {
    monthlySalary:
      input.monthlySalary !== undefined
        ? input.monthlySalary
        : existing.monthlySalary
          ? Number(existing.monthlySalary)
          : undefined,
    dailyWage:
      input.dailyWage !== undefined
        ? input.dailyWage
        : existing.dailyWage
          ? Number(existing.dailyWage)
          : undefined,
  };
  validateSalaryFields(merged);

  if (input.userId) {
    const linked = await prisma.employee.findFirst({
      where: { userId: input.userId, NOT: { id } },
    });
    if (linked) {
      throw new EmployeeError("This user is already linked to another employee.");
    }
  }

  const row = await prisma.employee.update({
    where: { id },
    data: {
      ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
      ...(input.userId !== undefined
        ? { userId: input.userId || null }
        : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.designation !== undefined
        ? { designation: input.designation.trim() }
        : {}),
      ...(input.dateOfJoining !== undefined
        ? { dateOfJoining: new Date(input.dateOfJoining) }
        : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.monthlySalary !== undefined
        ? {
            monthlySalary:
              input.monthlySalary != null ? toMoney(input.monthlySalary) : null,
          }
        : {}),
      ...(input.dailyWage !== undefined
        ? {
            dailyWage:
              input.dailyWage != null ? toMoney(input.dailyWage) : null,
          }
        : {}),
      ...(input.basicPercent !== undefined
        ? { basicPercent: toMoney(input.basicPercent) }
        : {}),
      ...(input.hraPercent !== undefined
        ? { hraPercent: toMoney(input.hraPercent) }
        : {}),
      ...(input.pfApplicable !== undefined
        ? { pfApplicable: input.pfApplicable }
        : {}),
      ...(input.esiApplicable !== undefined
        ? { esiApplicable: input.esiApplicable }
        : {}),
      ...(input.professionalTaxApplicable !== undefined
        ? { professionalTaxApplicable: input.professionalTaxApplicable }
        : {}),
      ...(input.bankAccountNo !== undefined
        ? { bankAccountNo: input.bankAccountNo?.trim() || null }
        : {}),
      ...(input.bankIfsc !== undefined
        ? { bankIfsc: input.bankIfsc?.trim() || null }
        : {}),
    },
  });
  return toEmployee(row);
};

export const getEmployeeByUserId = async (
  userId: string,
  organizationId: string,
): Promise<Employee | null> => {
  const row = await prisma.employee.findFirst({
    where: { userId, organizationId, active: true },
  });
  return row ? toEmployee(row) : null;
};
