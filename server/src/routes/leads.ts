import { Router } from "express";
import {
  addAppointment,
  addFollowUp,
  completeFollowUp,
  convertLead,
  countFollowUpsDueToday,
  createLead,
  getLeadDetail,
  LeadError,
  listCalendarEvents,
  listLeads,
  moveLeadStage,
  updateLead,
} from "../lib/leads/service.js";
import { canManageCustomers } from "../lib/auth/permissions.js";
import { getBranchScope } from "../lib/branches/access.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";
import { routeParam } from "../lib/route-param.js";
import type {
  LeadStage,
  NewAppointmentInput,
  NewFollowUpInput,
  NewLeadInput,
  UpdateLeadInput,
} from "../types.js";
import { LEAD_STAGES } from "../lib/leads/constants.js";

export const leadsRouter = Router();

leadsRouter.use(authenticate);
leadsRouter.use(requireOrganization);

leadsRouter.get(
  "/",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const leads = await listLeads(req.organizationId!, branchId);
      res.json({ leads });
    } catch (error) {
      console.error("GET /api/leads", error);
      res.status(500).json({ error: "Failed to fetch leads." });
    }
  },
);

leadsRouter.get(
  "/follow-ups-due-count",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const count = await countFollowUpsDueToday(req.organizationId!);
      res.json({ count });
    } catch (error) {
      console.error("GET /api/leads/follow-ups-due-count", error);
      res.status(500).json({ error: "Failed to count follow-ups." });
    }
  },
);

leadsRouter.get(
  "/calendar",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const assignedToId =
        typeof req.query.assignedToId === "string"
          ? req.query.assignedToId
          : undefined;
      const events = await listCalendarEvents(req.organizationId!, assignedToId);
      res.json(events);
    } catch (error) {
      console.error("GET /api/leads/calendar", error);
      res.status(500).json({ error: "Failed to fetch calendar." });
    }
  },
);

leadsRouter.get(
  "/:id",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lead = await getLeadDetail(
        routeParam(req.params.id),
        req.organizationId!,
      );
      if (!lead) {
        res.status(404).json({ error: "Lead not found." });
        return;
      }
      res.json(lead);
    } catch (error) {
      console.error("GET /api/leads/:id", error);
      res.status(500).json({ error: "Failed to fetch lead." });
    }
  },
);

leadsRouter.post(
  "/",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lead = await createLead(
        req.organizationId!,
        req.body as NewLeadInput,
        req.user!.name,
      );
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof LeadError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/leads", error);
      res.status(500).json({ error: "Failed to create lead." });
    }
  },
);

leadsRouter.patch(
  "/:id",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lead = await updateLead(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as UpdateLeadInput,
      );
      res.json(lead);
    } catch (error) {
      if (error instanceof LeadError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/leads/:id", error);
      res.status(500).json({ error: "Failed to update lead." });
    }
  },
);

leadsRouter.post(
  "/:id/stage",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const stage = req.body?.stage as LeadStage;
      if (!stage || !LEAD_STAGES.includes(stage)) {
        res.status(400).json({ error: "Valid stage is required." });
        return;
      }
      const lead = await moveLeadStage(
        routeParam(req.params.id),
        req.organizationId!,
        stage,
        typeof req.body?.lostReason === "string" ? req.body.lostReason : undefined,
      );
      res.json(lead);
    } catch (error) {
      if (error instanceof LeadError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/leads/:id/stage", error);
      res.status(500).json({ error: "Failed to update lead stage." });
    }
  },
);

leadsRouter.post(
  "/:id/appointments",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const appointment = await addAppointment(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as NewAppointmentInput,
        req.user!.name,
      );
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof LeadError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/leads/:id/appointments", error);
      res.status(500).json({ error: "Failed to add appointment." });
    }
  },
);

leadsRouter.post(
  "/:id/follow-ups",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const followUp = await addFollowUp(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as NewFollowUpInput,
        req.user!.name,
      );
      res.status(201).json(followUp);
    } catch (error) {
      if (error instanceof LeadError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/leads/:id/follow-ups", error);
      res.status(500).json({ error: "Failed to add follow-up." });
    }
  },
);

leadsRouter.post(
  "/:id/follow-ups/:followUpId/complete",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const followUp = await completeFollowUp(
        routeParam(req.params.id),
        routeParam(req.params.followUpId),
        req.organizationId!,
        typeof req.body?.outcome === "string" ? req.body.outcome : undefined,
      );
      res.json(followUp);
    } catch (error) {
      if (error instanceof LeadError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/leads/:id/follow-ups/:followUpId/complete", error);
      res.status(500).json({ error: "Failed to complete follow-up." });
    }
  },
);

leadsRouter.post(
  "/:id/convert",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await convertLead(
        routeParam(req.params.id),
        req.organizationId!,
      );
      res.json(result);
    } catch (error) {
      if (error instanceof LeadError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/leads/:id/convert", error);
      res.status(500).json({ error: "Failed to convert lead." });
    }
  },
);
