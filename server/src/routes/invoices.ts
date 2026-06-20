import { Router } from "express";
import { canViewInvoices } from "../lib/auth/permissions.js";
import { getCustomer } from "../lib/customers/service.js";
import { getInvoice, listInvoices } from "../lib/invoices/service.js";
import { generateInvoicePdf } from "../lib/invoices/pdf.js";
import { getShopSettings } from "../lib/settings/service.js";
import { routeParam } from "../lib/route-param.js";
import {
  authenticate,
  requireRole,
} from "../middleware/auth.js";

export const invoicesRouter = Router();

invoicesRouter.use(authenticate);

invoicesRouter.get("/", requireRole(canViewInvoices), async (_req, res) => {
  try {
    const invoices = await listInvoices();
    res.json(invoices);
  } catch (error) {
    console.error("GET /api/invoices", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

invoicesRouter.get(
  "/:id/pdf",
  requireRole(canViewInvoices),
  async (req, res) => {
    try {
      const invoice = await getInvoice(routeParam(req.params.id));
      if (!invoice) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }

      const settings = await getShopSettings();
      const customerBilling = invoice.customerId
        ? await getCustomer(invoice.customerId)
        : null;
      const pdf = await generateInvoicePdf(invoice, settings, customerBilling);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${invoice.invoiceNo}.pdf"`,
      );
      res.send(pdf);
    } catch (error) {
      console.error("GET /api/invoices/:id/pdf", error);
      res.status(500).json({ error: "Failed to generate invoice PDF" });
    }
  },
);

invoicesRouter.get(
  "/:id",
  requireRole(canViewInvoices),
  async (req, res) => {
    try {
      const invoice = await getInvoice(routeParam(req.params.id));
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
