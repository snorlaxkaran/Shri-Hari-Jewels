import type { LeadStage as DbLeadStage, LeadSource as DbLeadSource } from "@prisma/client";

export const LEAD_STAGES = [
  "New",
  "Qualification",
  "Follow-up",
  "Opportunity",
  "Quotation",
  "Won",
  "Lost",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_SOURCES = [
  "Walk-in",
  "Referral",
  "Phone",
  "WhatsApp",
  "Instagram",
  "Website",
  "Other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

const DB_TO_API_STAGE: Record<DbLeadStage, LeadStage> = {
  New: "New",
  Qualification: "Qualification",
  FollowUp: "Follow-up",
  Opportunity: "Opportunity",
  Quotation: "Quotation",
  Won: "Won",
  Lost: "Lost",
};

const API_TO_DB_STAGE: Record<LeadStage, DbLeadStage> = {
  New: "New",
  Qualification: "Qualification",
  "Follow-up": "FollowUp",
  Opportunity: "Opportunity",
  Quotation: "Quotation",
  Won: "Won",
  Lost: "Lost",
};

const DB_TO_API_SOURCE: Record<DbLeadSource, LeadSource> = {
  WalkIn: "Walk-in",
  Referral: "Referral",
  Phone: "Phone",
  WhatsApp: "WhatsApp",
  Instagram: "Instagram",
  Website: "Website",
  Other: "Other",
};

const API_TO_DB_SOURCE: Record<LeadSource, DbLeadSource> = {
  "Walk-in": "WalkIn",
  Referral: "Referral",
  Phone: "Phone",
  WhatsApp: "WhatsApp",
  Instagram: "Instagram",
  Website: "Website",
  Other: "Other",
};

export const toApiLeadStage = (stage: DbLeadStage): LeadStage => DB_TO_API_STAGE[stage];
export const toDbLeadStage = (stage: LeadStage): DbLeadStage => API_TO_DB_STAGE[stage];
export const toApiLeadSource = (source: DbLeadSource): LeadSource => DB_TO_API_SOURCE[source];
export const toDbLeadSource = (source: LeadSource): DbLeadSource => API_TO_DB_SOURCE[source];

export const nextLeadStage = (stage: LeadStage): LeadStage | null => {
  if (stage === "Lost" || stage === "Won") return null;
  const idx = LEAD_STAGES.indexOf(stage);
  if (idx < 0 || idx >= LEAD_STAGES.length - 2) return null;
  return LEAD_STAGES[idx + 1];
};

export const ACTIVE_LEAD_STAGES = LEAD_STAGES.filter(
  (s) => s !== "Won" && s !== "Lost",
);
