import { Router } from "express";
import rateLimit from "express-rate-limit";
import { routeParam } from "../lib/route-param.js";
import { sendInvoicePdfResponse } from "../lib/invoices/pdf-response.js";
import { verifyInvoiceShareToken } from "../lib/invoices/share-token.js";

export const publicInvoicesRouter = Router();

publicInvoicesRouter.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again shortly." },
  }),
);

publicInvoicesRouter.get("/invoices/:token/pdf", async (req, res) => {
  try {
    const verified = verifyInvoiceShareToken(routeParam(req.params.token));
    if (!verified) {
      res.status(404).json({ error: "Invoice link expired or invalid." });
      return;
    }

    const sent = await sendInvoicePdfResponse(verified.invoiceId, res);
    if (!sent) {
      res.status(404).json({ error: "Invoice not found." });
    }
  } catch (error) {
    console.error("GET /api/public/invoices/:token/pdf", error);
    res.status(500).json({ error: "Failed to generate invoice PDF" });
  }
});
