import type {
  Appointment as PrismaAppointment,
  FollowUp as PrismaFollowUp,
  Lead as PrismaLead,
} from "@prisma/client";
import type { Appointment, FollowUp, Lead } from "../../types.js";
import { moneyToNumber } from "../money.js";
import {
  toApiLeadSource,
  toApiLeadStage,
} from "./constants.js";

export const toLead = (lead: PrismaLead): Lead => ({
  id: lead.id,
  organizationId: lead.organizationId,
  branchId: lead.branchId,
  name: lead.name,
  mobile: lead.mobile,
  email: lead.email ?? undefined,
  source: toApiLeadSource(lead.source),
  stage: toApiLeadStage(lead.stage),
  interestedIn: lead.interestedIn ?? undefined,
  budgetMin: lead.budgetMin != null ? moneyToNumber(lead.budgetMin) : undefined,
  budgetMax: lead.budgetMax != null ? moneyToNumber(lead.budgetMax) : undefined,
  assignedToId: lead.assignedToId ?? undefined,
  assignedToName: lead.assignedToName ?? undefined,
  customerId: lead.customerId ?? undefined,
  lostReason: lead.lostReason ?? undefined,
  createdAt: lead.createdAt.toISOString(),
  updatedAt: lead.updatedAt.toISOString(),
});

export const toAppointment = (row: PrismaAppointment): Appointment => ({
  id: row.id,
  leadId: row.leadId,
  branchId: row.branchId,
  title: row.title,
  scheduledAt: row.scheduledAt.toISOString(),
  notes: row.notes ?? undefined,
  reminderSent: row.reminderSent,
  completed: row.completed,
  createdByName: row.createdByName,
  createdAt: row.createdAt.toISOString(),
});

export const toFollowUp = (row: PrismaFollowUp): FollowUp => ({
  id: row.id,
  leadId: row.leadId,
  dueAt: row.dueAt.toISOString(),
  note: row.note ?? undefined,
  outcome: row.outcome ?? undefined,
  completedAt: row.completedAt?.toISOString(),
  createdByName: row.createdByName,
  createdAt: row.createdAt.toISOString(),
});
