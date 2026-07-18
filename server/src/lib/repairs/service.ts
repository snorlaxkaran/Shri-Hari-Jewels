import type { RepairStatus as DbRepairStatus, Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import type {
  ApproveRepairInput,
  DeliverRepairInput,
  EstimateRepairInput,
  NewRepairOrderInput,
  RejectRepairInput,
  RepairOrder,
  RepairStatus,
  UpdateRepairStatusInput,
} from "../../types.js";
import { createInvoiceForRepair } from "../invoices/service.js";
import { generateRepairNo } from "./repair-no.js";
import { toApiRepairStatus, toDbRepairStatus, toRepairOrder } from "./mappers.js";
import { toMoney } from "../money.js";

export class RepairError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "RepairError";
  }
}

const repairInclude = {
  statusLogs: { orderBy: { createdAt: "asc" as const } },
  photos: { orderBy: { createdAt: "asc" as const } },
  invoice: { select: { id: true, invoiceNo: true } },
};

const appendStatusLog = async (
  repairOrderId: string,
  status: DbRepairStatus,
  performedByName: string,
  notes?: string | null,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) => {
  await tx.repairStatusLog.create({
    data: {
      repairOrderId,
      status,
      notes: notes?.trim() || null,
      performedByName,
    },
  });
};

const getRepairOrThrow = async (id: string, organizationId: string) => {
  const order = await prisma.repairOrder.findFirst({
    where: { id, organizationId },
    include: repairInclude,
  });
  if (!order) throw new RepairError("Repair order not found.", 404);
  return order;
};

const repairApiStatus = (order: { status: DbRepairStatus }) =>
  toApiRepairStatus(order.status);

export type ListRepairsQuery = {
  status?: RepairStatus;
  search?: string;
  branchId?: string;
};

export const listRepairs = async (
  organizationId: string,
  query: ListRepairsQuery = {},
): Promise<RepairOrder[]> => {
  const search = query.search?.trim();
  const orders = await prisma.repairOrder.findMany({
    where: {
      organizationId,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.status ? { status: toDbRepairStatus(query.status) } : {}),
      ...(search
        ? {
            OR: [
              { repairNo: { contains: search, mode: "insensitive" } },
              { customerName: { contains: search, mode: "insensitive" } },
              { customerMobile: { contains: search } },
            ],
          }
        : {}),
    },
    include: repairInclude,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toRepairOrder);
};

export const getRepair = async (
  id: string,
  organizationId: string,
): Promise<RepairOrder | null> => {
  const order = await prisma.repairOrder.findFirst({
    where: { id, organizationId },
    include: repairInclude,
  });
  return order ? toRepairOrder(order) : null;
};

export const countReadyForPickup = async (
  organizationId: string,
  branchId?: string,
): Promise<number> =>
  prisma.repairOrder.count({
    where: {
      organizationId,
      status: "ReadyForPickup",
      ...(branchId ? { branchId } : {}),
    },
  });

export const createRepairOrder = async (
  input: NewRepairOrderInput,
  organizationId: string,
  branchId: string,
  createdByName: string,
): Promise<RepairOrder> => {
  if (!input.customerName?.trim()) {
    throw new RepairError("Customer name is required.");
  }
  if (!input.customerMobile?.trim()) {
    throw new RepairError("Customer mobile is required.");
  }
  if (!input.itemDescription?.trim()) {
    throw new RepairError("Item description is required.");
  }
  if (!input.requestedWork?.trim()) {
    throw new RepairError("Requested work is required.");
  }

  const repairNo = await generateRepairNo(organizationId);
  const photoUrls = input.intakePhotoUrls ?? [];

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.repairOrder.create({
      data: {
        organizationId,
        branchId,
        repairNo,
        customerId: input.customerId || null,
        customerName: input.customerName.trim(),
        customerMobile: input.customerMobile.trim(),
        itemDescription: input.itemDescription.trim(),
        intakeCondition: input.intakeCondition?.trim() || null,
        intakePhotoUrls: photoUrls,
        requestedWork: input.requestedWork.trim(),
        depositAmount: toMoney(input.depositAmount ?? 0),
        estimatedCost:
          input.estimatedCost != null ? toMoney(input.estimatedCost) : null,
        estimatedReadyDate: input.estimatedReadyDate
          ? new Date(input.estimatedReadyDate)
          : null,
        status: input.estimatedCost != null ? "Estimated" : "Received",
        createdByName,
        photos: {
          create: photoUrls.map((url) => ({
            url,
            stage: "Intake",
          })),
        },
      },
      include: repairInclude,
    });

    await appendStatusLog(
      created.id,
      created.status,
      createdByName,
      "Repair received at counter",
      tx,
    );

    if (input.estimatedCost != null) {
      await appendStatusLog(
        created.id,
        "Estimated",
        createdByName,
        "Initial estimate recorded at intake",
        tx,
      );
    }

    return created;
  });

  return toRepairOrder(order);
};

export const setRepairEstimate = async (
  id: string,
  organizationId: string,
  input: EstimateRepairInput,
  performedByName: string,
): Promise<RepairOrder> => {
  const existing = await getRepairOrThrow(id, organizationId);
  const status = repairApiStatus(existing);
  if (status === "Delivered" || status === "Cancelled") {
    throw new RepairError("Cannot update estimate for a closed repair order.");
  }
  if (input.estimatedCost == null || input.estimatedCost < 0) {
    throw new RepairError("Estimated cost is required.");
  }

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.repairOrder.update({
      where: { id },
      data: {
        estimatedCost: toMoney(input.estimatedCost!),
        estimatedReadyDate: input.estimatedReadyDate
          ? new Date(input.estimatedReadyDate)
          : null,
        status: "Estimated",
      },
      include: repairInclude,
    });

    await appendStatusLog(
      id,
      "Estimated",
      performedByName,
      input.notes ?? "Estimate added",
      tx,
    );

    return updated;
  });

  return toRepairOrder(order);
};

export const sendRepairForApproval = async (
  id: string,
  organizationId: string,
  performedByName: string,
): Promise<RepairOrder> => {
  const existing = await getRepairOrThrow(id, organizationId);
  const status = repairApiStatus(existing);
  if (existing.estimatedCost == null) {
    throw new RepairError("Add an estimate before sending for approval.");
  }
  if (!["Estimated", "Awaiting Approval"].includes(status)) {
    throw new RepairError("Repair must be estimated before sending for approval.");
  }

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.repairOrder.update({
      where: { id },
      data: { status: "AwaitingApproval" },
      include: repairInclude,
    });

    await appendStatusLog(
      id,
      "AwaitingApproval",
      performedByName,
      "Estimate sent to customer for approval",
      tx,
    );

    return updated;
  });

  return toRepairOrder(order);
};

export const approveRepair = async (
  id: string,
  organizationId: string,
  input: ApproveRepairInput,
  performedByName: string,
): Promise<RepairOrder> => {
  const existing = await getRepairOrThrow(id, organizationId);
  if (repairApiStatus(existing) !== "Awaiting Approval") {
    throw new RepairError("Repair is not awaiting customer approval.");
  }

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.repairOrder.update({
      where: { id },
      data: {
        status: "Approved",
        approvedAt: new Date(),
        approvedVia: input.approvedVia?.trim() || "In-person",
      },
      include: repairInclude,
    });

    await appendStatusLog(
      id,
      "Approved",
      performedByName,
      `Customer approved via ${input.approvedVia?.trim() || "In-person"}`,
      tx,
    );

    return updated;
  });

  return toRepairOrder(order);
};

export const rejectRepair = async (
  id: string,
  organizationId: string,
  input: RejectRepairInput,
  performedByName: string,
): Promise<RepairOrder> => {
  const existing = await getRepairOrThrow(id, organizationId);
  if (repairApiStatus(existing) !== "Awaiting Approval") {
    throw new RepairError("Repair is not awaiting customer approval.");
  }
  if (!input.rejectionReason?.trim()) {
    throw new RepairError("Rejection reason is required.");
  }

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.repairOrder.update({
      where: { id },
      data: {
        status: "Rejected",
        rejectionReason: input.rejectionReason.trim(),
      },
      include: repairInclude,
    });

    await appendStatusLog(
      id,
      "Rejected",
      performedByName,
      input.rejectionReason.trim(),
      tx,
    );

    return updated;
  });

  return toRepairOrder(order);
};

export const updateRepairStatus = async (
  id: string,
  organizationId: string,
  input: UpdateRepairStatusInput,
  performedByName: string,
): Promise<RepairOrder> => {
  const existing = await getRepairOrThrow(id, organizationId);
  const currentStatus = repairApiStatus(existing);

  if (input.status === "In Progress" && !input.assignedKarigarName?.trim()) {
    throw new RepairError("Karigar name is required when starting work.");
  }

  if (currentStatus === "Delivered" || currentStatus === "Cancelled") {
    throw new RepairError("Cannot change status of a closed repair order.");
  }

  if (!input.status) {
    throw new RepairError("Status is required.");
  }

  const dbStatus = toDbRepairStatus(input.status);

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.repairOrder.update({
      where: { id },
      data: {
        status: dbStatus,
        assignedKarigarName:
          input.assignedKarigarName?.trim() ||
          (input.status === "In Progress"
            ? existing.assignedKarigarName
            : undefined),
      },
      include: repairInclude,
    });

    await appendStatusLog(
      id,
      dbStatus,
      performedByName,
      input.notes ?? undefined,
      tx,
    );

    return updated;
  });

  return toRepairOrder(order);
};

export const deliverRepair = async (
  id: string,
  organizationId: string,
  input: DeliverRepairInput,
  performedByName: string,
): Promise<RepairOrder> => {
  const existing = await getRepairOrThrow(id, organizationId);
  if (repairApiStatus(existing) !== "Ready for Pickup") {
    throw new RepairError("Repair must be ready for pickup before delivery.");
  }
  if (input.finalCost == null || input.finalCost < 0) {
    throw new RepairError("Final cost is required.");
  }
  if (!input.deliveredToName?.trim()) {
    throw new RepairError("Delivered-to name is required.");
  }

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.repairOrder.update({
      where: { id },
      data: {
        status: "Delivered",
        finalCost: toMoney(input.finalCost!),
        deliveredAt: new Date(),
        deliveredToName: input.deliveredToName.trim(),
      },
      include: repairInclude,
    });

    await appendStatusLog(
      id,
      "Delivered",
      performedByName,
      `Delivered to ${input.deliveredToName.trim()}`,
      tx,
    );

    await createInvoiceForRepair(updated, organizationId, input.paymentMode ?? "Cash", tx);

    return tx.repairOrder.findUniqueOrThrow({
      where: { id },
      include: repairInclude,
    });
  });

  return toRepairOrder(order);
};

export const createRepairRedo = async (
  id: string,
  organizationId: string,
  branchId: string,
  createdByName: string,
): Promise<RepairOrder> => {
  const original = await getRepairOrThrow(id, organizationId);

  const repairNo = await generateRepairNo(organizationId);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.repairOrder.create({
      data: {
        organizationId,
        branchId,
        repairNo,
        customerId: original.customerId,
        customerName: original.customerName,
        customerMobile: original.customerMobile,
        itemDescription: original.itemDescription,
        intakeCondition: original.intakeCondition,
        intakePhotoUrls: original.intakePhotoUrls,
        requestedWork: original.requestedWork,
        redoOf: original.id,
        createdByName,
        photos: {
          create: (original.photos ?? []).map((photo) => ({
            url: photo.url,
            stage: photo.stage,
          })),
        },
      },
      include: repairInclude,
    });

    await appendStatusLog(
      created.id,
      "Received",
      createdByName,
      `Redo of repair ${original.repairNo}`,
      tx,
    );

    return created;
  });

  return toRepairOrder(order);
};
