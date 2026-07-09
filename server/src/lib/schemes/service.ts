import { prisma } from "../db.js";
import { moneyToNumber, toMoney } from "../money.js";

export const listSchemes = async (organizationId: string) => {
  const rows = await prisma.savingsScheme.findMany({
    where: { organizationId, active: true },
    orderBy: { name: "asc" },
  });
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description ?? undefined,
    durationMonths: s.durationMonths,
    monthlyAmount: moneyToNumber(s.monthlyAmount),
    bonusMonths: s.bonusMonths,
  }));
};

export const createScheme = async (
  organizationId: string,
  input: {
    name: string;
    description?: string;
    durationMonths: number;
    monthlyAmount: number;
    bonusMonths?: number;
  },
) => {
  return prisma.savingsScheme.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description,
      durationMonths: input.durationMonths,
      monthlyAmount: toMoney(input.monthlyAmount),
      bonusMonths: input.bonusMonths ?? 1,
    },
  });
};

export const enrollCustomer = async (input: {
  schemeId: string;
  customerId: string;
  branchId?: string;
  startDate?: Date;
}) => {
  const scheme = await prisma.savingsScheme.findUnique({
    where: { id: input.schemeId },
  });
  if (!scheme) throw new Error("Scheme not found");

  const startDate = input.startDate ?? new Date();
  const maturityDate = new Date(startDate);
  maturityDate.setMonth(maturityDate.getMonth() + scheme.durationMonths);

  return prisma.schemeEnrollment.create({
    data: {
      schemeId: input.schemeId,
      customerId: input.customerId,
      branchId: input.branchId,
      startDate,
      maturityDate,
      monthlyAmount: scheme.monthlyAmount,
    },
  });
};

export const recordInstallment = async (input: {
  enrollmentId: string;
  amount: number;
  paymentMode?: string;
  paymentRef?: string;
  recordedByName: string;
}) => {
  const enrollment = await prisma.schemeEnrollment.findUnique({
    where: { id: input.enrollmentId },
  });
  if (!enrollment) throw new Error("Enrollment not found");

  await prisma.$transaction(async (tx) => {
    await tx.schemeInstallment.create({
      data: {
        enrollmentId: input.enrollmentId,
        amount: toMoney(input.amount),
        paymentMode: input.paymentMode ?? "Cash",
        paymentRef: input.paymentRef,
        recordedByName: input.recordedByName,
      },
    });

    const newTotal = moneyToNumber(enrollment.totalPaid) + input.amount;
    const newCount = enrollment.installmentsPaid + 1;
    await tx.schemeEnrollment.update({
      where: { id: input.enrollmentId },
      data: {
        totalPaid: toMoney(newTotal),
        installmentsPaid: newCount,
        status: newCount >= enrollment.installmentsPaid + 1 ? enrollment.status : enrollment.status,
      },
    });
  });
};

export const listEnrollments = async (organizationId: string) => {
  const rows = await prisma.schemeEnrollment.findMany({
    where: { scheme: { organizationId } },
    include: {
      scheme: { select: { name: true } },
      customer: { select: { name: true, mobile: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((e) => ({
    id: e.id,
    schemeName: e.scheme.name,
    customerName: e.customer.name,
    customerMobile: e.customer.mobile,
    monthlyAmount: moneyToNumber(e.monthlyAmount),
    totalPaid: moneyToNumber(e.totalPaid),
    installmentsPaid: e.installmentsPaid,
    status: e.status,
    maturityDate: e.maturityDate.toISOString(),
  }));
};
