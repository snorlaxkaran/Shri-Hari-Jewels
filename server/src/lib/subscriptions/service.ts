import { Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "../db.js";

export class SubscriptionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "SubscriptionError";
  }
}

const TRIAL_MONTHS = 2;
const DEFAULT_MONTHLY_AMOUNT = new Prisma.Decimal(
  process.env.SUBSCRIPTION_DEFAULT_MONTHLY_AMOUNT ?? "5000",
);

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const formatPeriodCovered = (date: Date): string =>
  date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

export type SubscriptionSummary = {
  id: string;
  organizationId: string;
  status: SubscriptionStatus;
  planName: string;
  monthlyAmount: string;
  trialEndsAt: string;
  currentPeriodEnd: string;
  gracePeriodDays: number;
  suspendedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlatformPaymentSummary = {
  id: string;
  amount: string;
  method: string;
  periodCovered: string;
  recordedByName: string;
  notes: string | null;
  createdAt: string;
};

const toSubscriptionSummary = (sub: {
  id: string;
  organizationId: string;
  status: SubscriptionStatus;
  planName: string;
  monthlyAmount: Prisma.Decimal;
  trialEndsAt: Date;
  currentPeriodEnd: Date;
  gracePeriodDays: number;
  suspendedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): SubscriptionSummary => ({
  id: sub.id,
  organizationId: sub.organizationId,
  status: sub.status,
  planName: sub.planName,
  monthlyAmount: sub.monthlyAmount.toString(),
  trialEndsAt: sub.trialEndsAt.toISOString(),
  currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
  gracePeriodDays: sub.gracePeriodDays,
  suspendedAt: sub.suspendedAt?.toISOString() ?? null,
  cancelledAt: sub.cancelledAt?.toISOString() ?? null,
  createdAt: sub.createdAt.toISOString(),
  updatedAt: sub.updatedAt.toISOString(),
});

const toPaymentSummary = (payment: {
  id: string;
  amount: Prisma.Decimal;
  method: string;
  periodCovered: string;
  recordedByName: string;
  notes: string | null;
  createdAt: Date;
}): PlatformPaymentSummary => ({
  id: payment.id,
  amount: payment.amount.toString(),
  method: payment.method,
  periodCovered: payment.periodCovered,
  recordedByName: payment.recordedByName,
  notes: payment.notes,
  createdAt: payment.createdAt.toISOString(),
});

export const createTrialSubscription = async (
  organizationId: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const now = new Date();
  const trialEndsAt = addMonths(now, TRIAL_MONTHS);

  await tx.subscription.create({
    data: {
      organizationId,
      status: SubscriptionStatus.Trialing,
      planName: "Standard",
      monthlyAmount: DEFAULT_MONTHLY_AMOUNT,
      trialEndsAt,
      currentPeriodEnd: trialEndsAt,
      gracePeriodDays: 0,
    },
  });
};

export const getSubscriptionByOrganizationId = async (
  organizationId: string,
): Promise<SubscriptionSummary | null> => {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
  });
  return sub ? toSubscriptionSummary(sub) : null;
};

export const getSubscriptionWithPayments = async (organizationId: string) => {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!sub) return null;

  return {
    subscription: toSubscriptionSummary(sub),
    payments: sub.payments.map(toPaymentSummary),
  };
};

export type OrganizationWithSubscription = {
  id: string;
  name: string;
  slug: string;
  emailDomain: string | null;
  active: boolean;
  branchCount: number;
  userCount: number;
  adminEmail: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: SubscriptionSummary | null;
};

export const listOrganizationsWithSubscriptions = async (options?: {
  expiringWithinDays?: number;
}): Promise<OrganizationWithSubscription[]> => {
  const expiringWithinDays = options?.expiringWithinDays;

  const cutoff =
    expiringWithinDays != null
      ? addMonths(new Date(), 0)
      : null;
  if (cutoff && expiringWithinDays != null) {
    cutoff.setDate(cutoff.getDate() + expiringWithinDays);
  }

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { branches: true, users: true } },
      users: {
        where: { role: "Admin", active: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { email: true },
      },
      subscription: true,
    },
    ...(cutoff
      ? {
          where: {
            subscription: {
              currentPeriodEnd: { lte: cutoff },
              status: { in: [SubscriptionStatus.Trialing, SubscriptionStatus.Active, SubscriptionStatus.PastDue] },
            },
          },
        }
      : {}),
  });

  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    emailDomain: org.emailDomain,
    active: org.active,
    branchCount: org._count.branches,
    userCount: org._count.users,
    adminEmail: org.users[0]?.email ?? null,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
    subscription: org.subscription ? toSubscriptionSummary(org.subscription) : null,
  }));
};

export const getOrganizationSubscriptionDetail = async (organizationId: string) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      subscription: {
        include: { payments: { orderBy: { createdAt: "desc" } } },
      },
    },
  });

  if (!org) return null;

  return {
    organizationId: org.id,
    organizationName: org.name,
    subscription: org.subscription ? toSubscriptionSummary(org.subscription) : null,
    payments: org.subscription?.payments.map(toPaymentSummary) ?? [],
  };
};

export type RecordPaymentInput = {
  amount: number;
  method: string;
  periodCovered?: string;
  notes?: string;
  recordedByName: string;
};

export const recordSubscriptionPayment = async (
  organizationId: string,
  input: RecordPaymentInput,
): Promise<{ subscription: SubscriptionSummary; payment: PlatformPaymentSummary }> => {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
  });
  if (!sub) throw new SubscriptionError("Subscription not found.", 404);

  const amount = new Prisma.Decimal(input.amount);
  if (amount.lte(0)) throw new SubscriptionError("Payment amount must be positive.");

  const periodStart = sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
  const newPeriodEnd = addMonths(periodStart, 1);
  const periodCovered = input.periodCovered?.trim() || formatPeriodCovered(newPeriodEnd);

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.platformPayment.create({
      data: {
        subscriptionId: sub.id,
        amount,
        method: input.method.trim(),
        periodCovered,
        recordedByName: input.recordedByName.trim(),
        notes: input.notes?.trim() || null,
      },
    });

    const updated = await tx.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.Active,
        currentPeriodEnd: newPeriodEnd,
        suspendedAt: null,
        cancelledAt: null,
      },
    });

    return { payment, subscription: updated };
  });

  return {
    subscription: toSubscriptionSummary(result.subscription),
    payment: toPaymentSummary(result.payment),
  };
};

export type ExtendTrialInput = {
  newTrialEndsAt: string;
};

export const extendSubscriptionTrial = async (
  organizationId: string,
  input: ExtendTrialInput,
): Promise<SubscriptionSummary> => {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
  });
  if (!sub) throw new SubscriptionError("Subscription not found.", 404);

  const newTrialEndsAt = new Date(input.newTrialEndsAt);
  if (Number.isNaN(newTrialEndsAt.getTime())) {
    throw new SubscriptionError("Invalid trial end date.");
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      trialEndsAt: newTrialEndsAt,
      currentPeriodEnd: newTrialEndsAt,
      status:
        sub.status === SubscriptionStatus.Suspended
          ? SubscriptionStatus.Trialing
          : sub.status,
      suspendedAt: null,
    },
  });

  return toSubscriptionSummary(updated);
};

export const suspendSubscription = async (
  organizationId: string,
): Promise<SubscriptionSummary> => {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
  });
  if (!sub) throw new SubscriptionError("Subscription not found.", 404);

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: SubscriptionStatus.Suspended,
      suspendedAt: new Date(),
    },
  });

  return toSubscriptionSummary(updated);
};

export const reactivateSubscription = async (
  organizationId: string,
): Promise<SubscriptionSummary> => {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
  });
  if (!sub) throw new SubscriptionError("Subscription not found.", 404);

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: SubscriptionStatus.Active,
      suspendedAt: null,
    },
  });

  return toSubscriptionSummary(updated);
};

export type PlatformContactInfo = {
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
};

export const getPlatformContactInfo = (): PlatformContactInfo => ({
  phone: process.env.PLATFORM_CONTACT_PHONE?.trim() || null,
  email: process.env.PLATFORM_CONTACT_EMAIL?.trim() || null,
  whatsapp: process.env.PLATFORM_CONTACT_WHATSAPP?.trim() || null,
});

export const isBillingRoute = (originalUrl: string): boolean =>
  originalUrl.startsWith("/api/billing");

export const checkSubscriptionAccess = async (
  organizationId: string,
): Promise<
  | { allowed: true; subscription: SubscriptionSummary }
  | { allowed: false; subscription: SubscriptionSummary; expired: true }
  | { allowed: true; subscription: null }
> => {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  if (!sub) {
    return { allowed: true, subscription: null };
  }

  const cutoff = new Date(sub.currentPeriodEnd);
  cutoff.setDate(cutoff.getDate() + sub.gracePeriodDays);
  const isExpired = new Date() > cutoff;

  let status = sub.status;

  if (isExpired && status !== SubscriptionStatus.Suspended) {
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.Suspended, suspendedAt: new Date() },
    });
    status = updated.status;
    sub.trialEndsAt = updated.trialEndsAt;
    sub.currentPeriodEnd = updated.currentPeriodEnd;
    sub.suspendedAt = updated.suspendedAt;
  }

  const summary = toSubscriptionSummary({ ...sub, status });

  if (status === SubscriptionStatus.Suspended || status === SubscriptionStatus.Cancelled) {
    return { allowed: false, subscription: summary, expired: true };
  }

  return { allowed: true, subscription: summary };
};
