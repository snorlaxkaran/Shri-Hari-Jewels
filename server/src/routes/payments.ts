import { Router } from "express";
import {
  extractPaymentIdFromWebhook,
  extractSaleIdFromWebhook,
  verifyWebhookSignature,
} from "../lib/payments/razorpay.js";
import { handleRazorpayWebhookSale } from "../lib/sales/service.js";

export const paymentsRouter = Router();

paymentsRouter.post("/", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    if (typeof signature !== "string") {
      res.status(400).json({ error: "Missing signature" });
      return;
    }

    const rawBody =
      req.body instanceof Buffer
        ? req.body.toString("utf8")
        : JSON.stringify(req.body);

    if (!verifyWebhookSignature(rawBody, signature)) {
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const event = payload.event as string | undefined;

    if (event !== "payment.captured" && event !== "qr_code.credited") {
      res.json({ received: true, ignored: true });
      return;
    }

    const saleId = extractSaleIdFromWebhook(payload);
    const paymentId = extractPaymentIdFromWebhook(payload);

    if (saleId && paymentId) {
      await handleRazorpayWebhookSale(saleId, paymentId);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("POST /api/payments/razorpay/webhook", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});
