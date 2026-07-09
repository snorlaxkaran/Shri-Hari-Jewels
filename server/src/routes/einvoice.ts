import { Router } from "express";
import { generateEInvoice, listEInvoiceRecords } from "../lib/einvoice/service.js";
import { canManageCustomers } from "../lib/auth/permissions.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

export const einvoiceRouter = Router();

einvoiceRouter.get(
  "/",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const records = await listEInvoiceRecords(req.organizationId!);
      res.json({ records });
    } catch (error) {
      console.error("GET /api/einvoice", error);
      res.status(500).json({ error: "Failed to list e-invoice records." });
    }
  },
);

einvoiceRouter.post(
  "/generate",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body as { invoiceId?: string; saleId?: string };
      if (!body.invoiceId) {
        res.status(400).json({ error: "invoiceId is required." });
        return;
      }
      const record = await generateEInvoice({
        organizationId: req.organizationId!,
        invoiceId: body.invoiceId,
        saleId: body.saleId,
      });
      res.status(201).json({ record });
    } catch (error) {
      console.error("POST /api/einvoice/generate", error);
      res.status(500).json({ error: "Failed to generate e-invoice." });
    }
  },
);
