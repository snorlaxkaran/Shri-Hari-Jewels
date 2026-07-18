import { prisma } from "../db.js";
import { createCustomer } from "../customers/service.js";
import { moneyToNumber, toMoney } from "../money.js";
import type {
  Appointment,
  FollowUp,
  Lead,
  LeadDetail,
  NewAppointmentInput,
  NewFollowUpInput,
  NewLeadInput,
  UpdateLeadInput,
} from "../../types.js";
import {
  nextLeadStage,
  toApiLeadStage,
  toDbLeadSource,
  toDbLeadStage,
  type LeadStage,
} from "./constants.js";
import { toAppointment, toFollowUp, toLead } from "./mappers.js";

export class LeadError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "LeadError";
  }
}

const assertLead = async (id: string, organizationId: string) => {
  const lead = await prisma.lead.findFirst({
    where: { id, organizationId },
  });
  if (!lead) throw new LeadError("Lead not found.", 404);
  return lead;
};

export const listLeads = async (
  organizationId: string,
  branchId?: string,
): Promise<Lead[]> => {
  const rows = await prisma.lead.findMany({
    where: {
      organizationId,
      ...(branchId ? { branchId } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toLead);
};

export const getLeadDetail = async (
  id: string,
  organizationId: string,
): Promise<LeadDetail | null> => {
  const lead = await prisma.lead.findFirst({
    where: { id, organizationId },
    include: {
      appointments: { orderBy: { scheduledAt: "desc" } },
      followUps: { orderBy: { dueAt: "desc" } },
    },
  });
  if (!lead) return null;
  return {
    ...toLead(lead),
    appointments: lead.appointments.map(toAppointment),
    followUps: lead.followUps.map(toFollowUp),
  };
};

export const createLead = async (
  organizationId: string,
  input: NewLeadInput,
  actorName: string,
): Promise<Lead> => {
  if (!input.name.trim()) throw new LeadError("Name is required.");
  if (!input.mobile.trim()) throw new LeadError("Mobile is required.");

  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, organizationId, active: true },
  });
  if (!branch) throw new LeadError("Branch not found.", 404);

  const lead = await prisma.lead.create({
    data: {
      organizationId,
      branchId: input.branchId,
      name: input.name.trim(),
      mobile: input.mobile.trim(),
      email: input.email?.trim() || null,
      source: toDbLeadSource(input.source),
      stage: input.stage ? toDbLeadStage(input.stage) : undefined,
      interestedIn: input.interestedIn?.trim() || null,
      budgetMin: input.budgetMin != null ? toMoney(input.budgetMin) : null,
      budgetMax: input.budgetMax != null ? toMoney(input.budgetMax) : null,
      assignedToId: input.assignedToId ?? null,
      assignedToName: input.assignedToName?.trim() || actorName,
    },
  });
  return toLead(lead);
};

export const updateLead = async (
  id: string,
  organizationId: string,
  input: UpdateLeadInput,
): Promise<Lead> => {
  await assertLead(id, organizationId);

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.mobile !== undefined ? { mobile: input.mobile.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
      ...(input.source !== undefined ? { source: toDbLeadSource(input.source) } : {}),
      ...(input.stage !== undefined ? { stage: toDbLeadStage(input.stage) } : {}),
      ...(input.interestedIn !== undefined
        ? { interestedIn: input.interestedIn?.trim() || null }
        : {}),
      ...(input.budgetMin !== undefined
        ? { budgetMin: input.budgetMin != null ? toMoney(input.budgetMin) : null }
        : {}),
      ...(input.budgetMax !== undefined
        ? { budgetMax: input.budgetMax != null ? toMoney(input.budgetMax) : null }
        : {}),
      ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
      ...(input.assignedToName !== undefined
        ? { assignedToName: input.assignedToName?.trim() || null }
        : {}),
      ...(input.lostReason !== undefined
        ? { lostReason: input.lostReason?.trim() || null }
        : {}),
    },
  });
  return toLead(lead);
};

export const moveLeadStage = async (
  id: string,
  organizationId: string,
  stage: LeadStage,
  lostReason?: string,
): Promise<Lead> => {
  const existing = await assertLead(id, organizationId);
  if (stage === "Lost" && !lostReason?.trim()) {
    throw new LeadError("Lost reason is required when marking a lead as Lost.");
  }

  const next = nextLeadStage(toApiLeadStage(existing.stage));
  if (
    stage !== toApiLeadStage(existing.stage) &&
    next &&
    stage !== next &&
    stage !== "Lost" &&
    stage !== "Won"
  ) {
    // allow explicit stage jumps from UI drag-and-drop
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      stage: toDbLeadStage(stage),
      lostReason: stage === "Lost" ? lostReason?.trim() || null : null,
    },
  });
  return toLead(lead);
};

export const addAppointment = async (
  leadId: string,
  organizationId: string,
  input: NewAppointmentInput,
  actorName: string,
): Promise<Appointment> => {
  const lead = await assertLead(leadId, organizationId);
  if (!input.title.trim()) throw new LeadError("Appointment title is required.");

  const row = await prisma.appointment.create({
    data: {
      leadId,
      branchId: input.branchId ?? lead.branchId,
      title: input.title.trim(),
      scheduledAt: new Date(input.scheduledAt),
      notes: input.notes?.trim() || null,
      createdByName: actorName,
    },
  });
  return toAppointment(row);
};

export const addFollowUp = async (
  leadId: string,
  organizationId: string,
  input: NewFollowUpInput,
  actorName: string,
): Promise<FollowUp> => {
  await assertLead(leadId, organizationId);

  const row = await prisma.followUp.create({
    data: {
      leadId,
      dueAt: new Date(input.dueAt),
      note: input.note?.trim() || null,
      createdByName: actorName,
    },
  });
  return toFollowUp(row);
};

export const completeFollowUp = async (
  leadId: string,
  followUpId: string,
  organizationId: string,
  outcome?: string,
): Promise<FollowUp> => {
  await assertLead(leadId, organizationId);
  const row = await prisma.followUp.update({
    where: { id: followUpId },
    data: {
      completedAt: new Date(),
      outcome: outcome?.trim() || null,
    },
  });
  return toFollowUp(row);
};

export const convertLead = async (
  id: string,
  organizationId: string,
): Promise<{ lead: Lead; customerId: string }> => {
  const lead = await assertLead(id, organizationId);

  if (lead.customerId) {
    return { lead: toLead(lead), customerId: lead.customerId };
  }

  const existingCustomer = await prisma.customer.findFirst({
    where: { organizationId, mobile: lead.mobile },
  });

  const customer =
    existingCustomer ??
    (await createCustomer(organizationId, {
      name: lead.name,
      mobile: lead.mobile,
      email: lead.email ?? undefined,
      customerType: "Individual Buyer",
    }));

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      customerId: customer.id,
      stage: "Won",
    },
  });

  return { lead: toLead(updated), customerId: customer.id };
};

export const countFollowUpsDueToday = async (
  organizationId: string,
): Promise<number> => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return prisma.followUp.count({
    where: {
      lead: { organizationId },
      completedAt: null,
      dueAt: { gte: start, lt: end },
    },
  });
};

export const listCalendarEvents = async (
  organizationId: string,
  assignedToId?: string,
) => {
  const leadFilter = {
    organizationId,
    ...(assignedToId ? { assignedToId } : {}),
  };

  const [appointments, followUps] = await Promise.all([
    prisma.appointment.findMany({
      where: { lead: leadFilter, completed: false },
      include: { lead: { select: { name: true, assignedToName: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.followUp.findMany({
      where: { lead: leadFilter, completedAt: null },
      include: { lead: { select: { name: true, assignedToName: true } } },
      orderBy: { dueAt: "asc" },
    }),
  ]);

  return {
    appointments: appointments.map((a) => ({
      ...toAppointment(a),
      leadName: a.lead.name,
      assignedToName: a.lead.assignedToName ?? undefined,
    })),
    followUps: followUps.map((f) => ({
      ...toFollowUp(f),
      leadName: f.lead.name,
      assignedToName: f.lead.assignedToName ?? undefined,
    })),
  };
};
