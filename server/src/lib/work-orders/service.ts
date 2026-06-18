import { WorkOrderStatus as DbWorkOrderStatus } from "@prisma/client";
import { prisma } from "../db.js";
import type {
  NewWorkOrderInput,
  WorkOrder,
  WorkOrderPriority,
  WorkOrderStatus,
  UpdateWorkOrderInput,
} from "../../types.js";
import { generateWorkOrderNo } from "./work-order-no.js";

const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  "Open",
  "In Production",
  "QC",
  "Completed",
  "Cancelled",
];

const toDbWorkOrderStatus = (
  status?: WorkOrderStatus,
): DbWorkOrderStatus | undefined => {
  if (!status) return undefined;
  if (status === "In Production") return DbWorkOrderStatus.InProduction;
  return status as DbWorkOrderStatus;
};

export class WorkOrderError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "WorkOrderError";
  }
}

const workOrderInclude = {
  order: { select: { orderNo: true } },
  assignedTo: { select: { id: true, name: true } },
};

const toWorkOrder = (workOrder: {
  id: string;
  workOrderNo: string;
  orderId: string | null;
  assignedToId: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  order?: { orderNo: string } | null;
  assignedTo?: { id: string; name: string } | null;
}): WorkOrder => ({
  id: workOrder.id,
  workOrderNo: workOrder.workOrderNo,
  orderId: workOrder.orderId ?? undefined,
  orderNo: workOrder.order?.orderNo,
  assignedToId: workOrder.assignedToId ?? undefined,
  assignedToName: workOrder.assignedTo?.name,
  title: workOrder.title,
  description: workOrder.description,
  status: workOrder.status as WorkOrderStatus,
  priority: workOrder.priority as WorkOrderPriority,
  dueDate: workOrder.dueDate?.toISOString(),
  notes: workOrder.notes ?? undefined,
  createdAt: workOrder.createdAt.toISOString(),
  updatedAt: workOrder.updatedAt.toISOString(),
});

export const listWorkOrders = async (): Promise<WorkOrder[]> => {
  const workOrders = await prisma.workOrder.findMany({
    include: workOrderInclude,
    orderBy: { createdAt: "desc" },
  });
  return workOrders.map(toWorkOrder);
};

export const createWorkOrder = async (
  input: NewWorkOrderInput,
  branchId: string,
): Promise<WorkOrder> => {
  if (!input.title?.trim()) {
    throw new WorkOrderError("Work order title is required.");
  }
  if (!input.description?.trim()) {
    throw new WorkOrderError("Work order description is required.");
  }

  const workOrderNo = await generateWorkOrderNo();

  const workOrder = await prisma.workOrder.create({
    data: {
      branchId,
      workOrderNo,
      title: input.title.trim(),
      description: input.description.trim(),
      status: "Open",
      priority: input.priority ?? "Normal",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      notes: input.notes?.trim() || null,
      orderId: input.orderId || null,
    },
    include: workOrderInclude,
  });

  return toWorkOrder(workOrder);
};

export const updateWorkOrder = async (
  id: string,
  input: UpdateWorkOrderInput,
): Promise<WorkOrder> => {
  const existing = await prisma.workOrder.findUnique({ where: { id } });
  if (!existing) throw new WorkOrderError("Work order not found.", 404);

  if (input.status && !WORK_ORDER_STATUSES.includes(input.status)) {
    throw new WorkOrderError("Invalid work order status.");
  }

  const workOrder = await prisma.workOrder.update({
    where: { id },
    data: {
      status: toDbWorkOrderStatus(input.status),
      priority: input.priority,
      title: input.title?.trim(),
      description: input.description?.trim(),
      orderId: input.orderId === undefined ? undefined : input.orderId,
      assignedToId:
        input.assignedToId === undefined ? undefined : input.assignedToId,
      dueDate:
        input.dueDate === undefined
          ? undefined
          : input.dueDate
            ? new Date(input.dueDate)
            : null,
      notes:
        input.notes === undefined ? undefined : input.notes?.trim() || null,
    },
    include: workOrderInclude,
  });

  return toWorkOrder(workOrder);
};
