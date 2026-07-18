import type {
  RepairOrder as PrismaRepairOrder,
  RepairStatusLog as PrismaRepairStatusLog,
  RepairPhoto as PrismaRepairPhoto,
  RepairStatus as DbRepairStatus,
} from "@prisma/client";
import type {
  RepairOrder,
  RepairPhoto,
  RepairStatus,
  RepairStatusLog,
} from "../../types.js";
import { moneyToNumber } from "../money.js";

const DB_TO_API_STATUS: Record<DbRepairStatus, RepairStatus> = {
  Received: "Received",
  Estimated: "Estimated",
  AwaitingApproval: "Awaiting Approval",
  Approved: "Approved",
  InProgress: "In Progress",
  QualityCheck: "Quality Check",
  ReadyForPickup: "Ready for Pickup",
  Delivered: "Delivered",
  Rejected: "Rejected",
  Cancelled: "Cancelled",
};

export const toApiRepairStatus = (status: DbRepairStatus): RepairStatus =>
  DB_TO_API_STATUS[status];

export const toDbRepairStatus = (status: RepairStatus): DbRepairStatus => {
  const map: Record<RepairStatus, DbRepairStatus> = {
    Received: "Received",
    Estimated: "Estimated",
    "Awaiting Approval": "AwaitingApproval",
    Approved: "Approved",
    "In Progress": "InProgress",
    "Quality Check": "QualityCheck",
    "Ready for Pickup": "ReadyForPickup",
    Delivered: "Delivered",
    Rejected: "Rejected",
    Cancelled: "Cancelled",
  };
  return map[status];
};

const toRepairStatusLog = (log: PrismaRepairStatusLog): RepairStatusLog => ({
  id: log.id,
  status: toApiRepairStatus(log.status),
  notes: log.notes ?? undefined,
  performedByName: log.performedByName,
  createdAt: log.createdAt.toISOString(),
});

const toRepairPhoto = (photo: PrismaRepairPhoto): RepairPhoto => ({
  id: photo.id,
  url: photo.url,
  stage: photo.stage,
  createdAt: photo.createdAt.toISOString(),
});

type RepairOrderWithRelations = PrismaRepairOrder & {
  statusLogs?: PrismaRepairStatusLog[];
  photos?: PrismaRepairPhoto[];
  invoice?: { id: string; invoiceNo: string } | null;
};

export const toRepairOrder = (order: RepairOrderWithRelations): RepairOrder => ({
  id: order.id,
  organizationId: order.organizationId,
  branchId: order.branchId,
  repairNo: order.repairNo,
  customerId: order.customerId ?? undefined,
  customerName: order.customerName,
  customerMobile: order.customerMobile,
  itemDescription: order.itemDescription,
  intakeCondition: order.intakeCondition ?? undefined,
  intakePhotoUrls: order.intakePhotoUrls,
  requestedWork: order.requestedWork,
  estimatedCost:
    order.estimatedCost != null ? moneyToNumber(order.estimatedCost) : undefined,
  estimatedReadyDate: order.estimatedReadyDate?.toISOString(),
  depositAmount: moneyToNumber(order.depositAmount),
  finalCost: order.finalCost != null ? moneyToNumber(order.finalCost) : undefined,
  status: toApiRepairStatus(order.status),
  assignedKarigarName: order.assignedKarigarName ?? undefined,
  approvedAt: order.approvedAt?.toISOString(),
  approvedVia: order.approvedVia ?? undefined,
  rejectionReason: order.rejectionReason ?? undefined,
  deliveredAt: order.deliveredAt?.toISOString(),
  deliveredToName: order.deliveredToName ?? undefined,
  redoOf: order.redoOf ?? undefined,
  createdByName: order.createdByName,
  createdAt: order.createdAt.toISOString(),
  updatedAt: order.updatedAt.toISOString(),
  invoiceId: order.invoice?.id,
  invoiceNo: order.invoice?.invoiceNo,
  statusLogs: order.statusLogs?.map(toRepairStatusLog),
  photos: order.photos?.map(toRepairPhoto),
});
