import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../db.js";
import { moneyToNumber, toMoney } from "../money.js";
import { writeAuditLog } from "../audit/service.js";
import { createNotificationForAdmins } from "../notifications/service.js";

export class DiscountApprovalError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "DiscountApprovalError";
  }
}

export const getDiscountThresholdPct = async (
  organizationId: string,
): Promise<number> => {
  const settings = await prisma.shopSettings.findUnique({
    where: { organizationId },
    select: { discountApprovalThresholdPct: true },
  });
  return moneyToNumber(settings?.discountApprovalThresholdPct ?? 10);
};

export const computeDiscountPct = (
  listPrice: number,
  discount: number,
): number => {
  if (listPrice <= 0) return 0;
  return (discount / listPrice) * 100;
};

export const requiresDiscountApproval = async (
  organizationId: string,
  listPrice: number,
  discount: number,
): Promise<boolean> => {
  if (discount <= 0) return false;
  const threshold = await getDiscountThresholdPct(organizationId);
  return computeDiscountPct(listPrice, discount) > threshold;
};

export const createDiscountApprovalRequest = async (input: {
  organizationId: string;
  branchId?: string;
  requestedById: string;
  requestedByName: string;
  listPrice: number;
  discount: number;
  reason?: string;
  entityType?: string;
  entityRef?: string;
}) => {
  const discountPct = computeDiscountPct(input.listPrice, input.discount);
  const approval = await prisma.discountApproval.create({
    data: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      requestedById: input.requestedById,
      requestedByName: input.requestedByName,
      listPrice: toMoney(input.listPrice),
      discount: toMoney(input.discount),
      discountPct: new Decimal(discountPct.toFixed(2)),
      reason: input.reason,
      entityType: input.entityType ?? "Sale",
      entityRef: input.entityRef,
      status: "Pending",
    },
  });

  await createNotificationForAdmins(input.organizationId, {
    type: "discount_approval",
    title: "Discount approval required",
    message: `${input.requestedByName} requested ${discountPct.toFixed(1)}% discount approval.`,
    link: "/approvals",
  });

  return approval;
};

export const listPendingDiscountApprovals = async (organizationId: string) => {
  const rows = await prisma.discountApproval.findMany({
    where: { organizationId, status: "Pending" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    requestedByName: row.requestedByName,
    listPrice: moneyToNumber(row.listPrice),
    discount: moneyToNumber(row.discount),
    discountPct: moneyToNumber(row.discountPct),
    reason: row.reason ?? undefined,
    entityType: row.entityType,
    entityRef: row.entityRef ?? undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
};

export const resolveDiscountApproval = async (
  approvalId: string,
  organizationId: string,
  approver: { id: string; name: string },
  approve: boolean,
) => {
  const approval = await prisma.discountApproval.findFirst({
    where: { id: approvalId, organizationId, status: "Pending" },
  });
  if (!approval) {
    throw new DiscountApprovalError("Approval request not found.", 404);
  }

  const updated = await prisma.discountApproval.update({
    where: { id: approvalId },
    data: {
      status: approve ? "Approved" : "Rejected",
      approvedById: approver.id,
      approvedByName: approver.name,
      resolvedAt: new Date(),
    },
  });

  await writeAuditLog({
    organizationId,
    entityType: "DiscountApproval",
    entityId: approvalId,
    action: approve ? "APPROVED" : "REJECTED",
    before: { status: "Pending" },
    after: { status: updated.status },
    actor: approver,
  });

  return updated;
};

export const assertDiscountApproved = async (
  organizationId: string,
  listPrice: number,
  discount: number,
  approvalId?: string,
): Promise<void> => {
  const needsApproval = await requiresDiscountApproval(
    organizationId,
    listPrice,
    discount,
  );
  if (!needsApproval) return;

  if (!approvalId) {
    throw new DiscountApprovalError(
      "Discount exceeds threshold and requires manager approval.",
      403,
    );
  }

  const approval = await prisma.discountApproval.findFirst({
    where: {
      id: approvalId,
      organizationId,
      status: "Approved",
    },
  });
  if (!approval) {
    throw new DiscountApprovalError(
      "Valid discount approval is required before completing this sale.",
      403,
    );
  }
};
