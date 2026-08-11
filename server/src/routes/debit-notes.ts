import { Router } from "express";
import { canManageAccounting } from "../lib/auth/permissions.js";
import { DEBIT_NOTE_REASONS } from "../lib/debit-notes/reasons.js";
import {
  DebitNoteError,
  getDebitNote,
  issueDebitNote,
  listDebitNotes,
  listDebitNotesForBill,
} from "../lib/debit-notes/service.js";
import { sendDebitNotePdfResponse } from "../lib/credit-notes/pdf-response.js";
import { routeParam } from "../lib/route-param.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { getBranchScope, getUserBranch } from "../lib/branches/access.js";
import type { NewDebitNoteInput } from "../types.js";

export const debitNotesRouter = Router();

debitNotesRouter.use(authenticate);
debitNotesRouter.use(attachOrganization);

debitNotesRouter.get("/meta", requireRole(canManageAccounting), (_req, res) => {
  res.json({ reasons: DEBIT_NOTE_REASONS });
});

debitNotesRouter.get(
  "/",
  requireRole(canManageAccounting),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const notes = await listDebitNotes(req.organizationId!, branchId);
      res.json(notes);
    } catch (error) {
      console.error("GET /api/debit-notes", error);
      res.status(500).json({ error: "Failed to fetch debit notes" });
    }
  },
);

debitNotesRouter.get(
  "/bill/:purchaseBillId",
  requireRole(canManageAccounting),
  async (req: AuthenticatedRequest, res) => {
    try {
      const notes = await listDebitNotesForBill(
        routeParam(req.params.purchaseBillId),
        req.organizationId!,
      );
      res.json(notes);
    } catch (error) {
      console.error("GET /api/debit-notes/bill/:purchaseBillId", error);
      res.status(500).json({ error: "Failed to fetch debit notes" });
    }
  },
);

debitNotesRouter.post(
  "/",
  requireRole(canManageAccounting),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const note = await issueDebitNote(
        req.organizationId!,
        branchId,
        { id: req.user!.id, name: req.user!.name },
        req.body as NewDebitNoteInput,
      );
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof DebitNoteError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/debit-notes", error);
      res.status(500).json({ error: "Failed to issue debit note" });
    }
  },
);

debitNotesRouter.get(
  "/:id/pdf",
  requireRole(canManageAccounting),
  async (req: AuthenticatedRequest, res) => {
    try {
      const sent = await sendDebitNotePdfResponse(
        routeParam(req.params.id),
        req.organizationId!,
        res,
      );
      if (!sent) {
        res.status(404).json({ error: "Debit note not found" });
      }
    } catch (error) {
      console.error("GET /api/debit-notes/:id/pdf", error);
      res.status(500).json({ error: "Failed to generate debit note PDF" });
    }
  },
);

debitNotesRouter.get(
  "/:id",
  requireRole(canManageAccounting),
  async (req: AuthenticatedRequest, res) => {
    try {
      const note = await getDebitNote(routeParam(req.params.id), req.organizationId!);
      if (!note) {
        res.status(404).json({ error: "Debit note not found" });
        return;
      }
      res.json(note);
    } catch (error) {
      console.error("GET /api/debit-notes/:id", error);
      res.status(500).json({ error: "Failed to fetch debit note" });
    }
  },
);
