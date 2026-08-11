import { Router } from "express";
import {
  canManageCreditNotes,
  canViewInvoices,
} from "../lib/auth/permissions.js";
import {
  CREDIT_NOTE_REASONS,
  CREDIT_NOTE_REFUND_MODES,
} from "../lib/credit-notes/reasons.js";
import {
  CreditNoteError,
  getCreditNote,
  getInvoiceCreditSummary,
  issueCreditNote,
  listCreditNotes,
  listCreditNotesForInvoice,
} from "../lib/credit-notes/service.js";
import { sendCreditNotePdfResponse } from "../lib/credit-notes/pdf-response.js";
import { routeParam } from "../lib/route-param.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { getBranchScope } from "../lib/branches/access.js";
import type { NewCreditNoteInput } from "../types.js";

export const creditNotesRouter = Router();

creditNotesRouter.use(authenticate);
creditNotesRouter.use(attachOrganization);

const requireCreditNoteAccess = requireRole(
  (role) => canViewInvoices(role) && canManageCreditNotes(role),
);

creditNotesRouter.get("/meta", requireCreditNoteAccess, (_req, res) => {
  res.json({
    reasons: CREDIT_NOTE_REASONS,
    refundModes: CREDIT_NOTE_REFUND_MODES,
  });
});

creditNotesRouter.get("/", requireCreditNoteAccess, async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getBranchScope(
      req.user!.id,
      req.user!.role,
      req.organizationId!,
    );
    const notes = await listCreditNotes(req.organizationId!, branchId);
    res.json(notes);
  } catch (error) {
    console.error("GET /api/credit-notes", error);
    res.status(500).json({ error: "Failed to fetch credit notes" });
  }
});

creditNotesRouter.get(
  "/invoice/:invoiceId/summary",
  requireCreditNoteAccess,
  async (req: AuthenticatedRequest, res) => {
    try {
      const summary = await getInvoiceCreditSummary(
        routeParam(req.params.invoiceId),
        req.organizationId!,
      );
      res.json(summary);
    } catch (error) {
      if (error instanceof CreditNoteError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/credit-notes/invoice/:invoiceId/summary", error);
      res.status(500).json({ error: "Failed to fetch credit summary" });
    }
  },
);

creditNotesRouter.get(
  "/invoice/:invoiceId",
  requireCreditNoteAccess,
  async (req: AuthenticatedRequest, res) => {
    try {
      const notes = await listCreditNotesForInvoice(
        routeParam(req.params.invoiceId),
        req.organizationId!,
      );
      res.json(notes);
    } catch (error) {
      console.error("GET /api/credit-notes/invoice/:invoiceId", error);
      res.status(500).json({ error: "Failed to fetch credit notes" });
    }
  },
);

creditNotesRouter.post("/", requireCreditNoteAccess, async (req: AuthenticatedRequest, res) => {
  try {
    const note = await issueCreditNote(
      req.organizationId!,
      { id: req.user!.id, name: req.user!.name },
      req.body as NewCreditNoteInput,
    );
    res.status(201).json(note);
  } catch (error) {
    if (error instanceof CreditNoteError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/credit-notes", error);
    res.status(500).json({ error: "Failed to issue credit note" });
  }
});

creditNotesRouter.get(
  "/:id/pdf",
  requireCreditNoteAccess,
  async (req: AuthenticatedRequest, res) => {
    try {
      const sent = await sendCreditNotePdfResponse(
        routeParam(req.params.id),
        req.organizationId!,
        res,
      );
      if (!sent) {
        res.status(404).json({ error: "Credit note not found" });
      }
    } catch (error) {
      console.error("GET /api/credit-notes/:id/pdf", error);
      res.status(500).json({ error: "Failed to generate credit note PDF" });
    }
  },
);

creditNotesRouter.get(
  "/:id",
  requireCreditNoteAccess,
  async (req: AuthenticatedRequest, res) => {
    try {
      const note = await getCreditNote(routeParam(req.params.id), req.organizationId!);
      if (!note) {
        res.status(404).json({ error: "Credit note not found" });
        return;
      }
      res.json(note);
    } catch (error) {
      console.error("GET /api/credit-notes/:id", error);
      res.status(500).json({ error: "Failed to fetch credit note" });
    }
  },
);
