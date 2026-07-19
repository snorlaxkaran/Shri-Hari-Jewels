import { Router } from "express";
import { canViewInvoices } from "../lib/auth/permissions.js";
import { getInvoice, listInvoices } from "../lib/invoices/service.js";
import { sendInvoicePdfResponse } from "../lib/invoices/pdf-response.js";
import { createInvoiceShareToken } from "../lib/invoices/share-token.js";
import { routeParam } from "../lib/route-param.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";

export const invoicesRouter = Router();

invoicesRouter.use(authenticate);
invoicesRouter.use(attachOrganization);

invoicesRouter.get("/", requireRole(canViewInvoices), async (req: AuthenticatedRequest, res) => {
  try {
    const invoices = await listInvoices(req.organizationId!);
    res.json(invoices);
  } catch (error) {
    console.error("GET /api/invoices", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

invoicesRouter.get(
  "/:id/share-token",
  requireRole(canViewInvoices),
  async (req: AuthenticatedRequest, res) => {
    try {
      const invoice = await getInvoice(routeParam(req.params.id), req.organizationId!);
      if (!invoice) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }

      const { token, expiresAt } = createInvoiceShareToken(invoice.id);
      res.json({
        token,
        expiresAt: expiresAt.toISOString(),
        invoiceNo: invoice.invoiceNo,
      });
    } catch (error) {
      console.error("GET /api/invoices/:id/share-token", error);
      res.status(500).json({ error: "Failed to create invoice share link" });
    }
  },
);

invoicesRouter.get(
  "/:id/pdf",
  requireRole(canViewInvoices),
  async (req: AuthenticatedRequest, res) => {
    try {
      const invoice = await getInvoice(routeParam(req.params.id), req.organizationId!);
      if (!invoice) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }

      const sent = await sendInvoicePdfResponse(invoice.id, res);
      if (!sent) {
        res.status(404).json({ error: "Invoice not found" });
      }
    } catch (error) {
      console.error("GET /api/invoices/:id/pdf", error);
      res.status(500).json({ error: "Failed to generate invoice PDF" });
    }
  },
);

invoicesRouter.get(
  "/:id",
  requireRole(canViewInvoices),
  async (req: AuthenticatedRequest, res) => {
    try {
      const invoice = await getInvoice(routeParam(req.params.id), req.organizationId!);
      if (!invoice) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }
      res.json(invoice);
    } catch (error) {
      console.error("GET /api/invoices/:id", error);
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  },
);
