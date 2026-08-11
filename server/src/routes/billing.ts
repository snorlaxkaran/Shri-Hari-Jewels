import { Router } from "express";
import { canManageSettings } from "../lib/auth/permissions.js";
import {
  computeMonthlyAmountFromModules,
  JEWELLERY_MODULES,
  MODULE_LABELS,
  MODULE_PRICING,
} from "../lib/onboarding/config.js";
import {
  getOrganizationModules,
  updateOrganizationModules,
} from "../lib/modules/access.js";
import {
  createSubscriptionOrder,
  getRazorpayKeyId,
  isRazorpayEnabled,
  verifyPaymentSignature,
} from "../lib/payments/razorpay.js";
import {
  getPlatformContactInfo,
  getSubscriptionWithPayments,
  recalculateSubscriptionAmount,
  recordSubscriptionPayment,
  SubscriptionError,
} from "../lib/subscriptions/service.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";

export const billingRouter = Router();

billingRouter.get("/contact", async (_req, res) => {
  res.json(getPlatformContactInfo());
});

billingRouter.get("/modules/pricing", (_req, res) => {
  res.json({
    modules: JEWELLERY_MODULES.map((id) => ({
      id,
      label: MODULE_LABELS[id],
      monthlyPrice: MODULE_PRICING[id],
    })),
  });
});

billingRouter.use(authenticate);
billingRouter.use(attachOrganization);

billingRouter.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const data = await getSubscriptionWithPayments(req.organizationId!);
    if (!data) {
      res.status(404).json({ error: "Subscription not found." });
      return;
    }
    res.json({
      ...data,
      razorpayEnabled: isRazorpayEnabled(),
      razorpayKeyId: getRazorpayKeyId(),
    });
  } catch (error) {
    console.error("GET /api/billing", error);
    res.status(500).json({ error: "Failed to fetch billing information." });
  }
});

billingRouter.get("/modules", async (req: AuthenticatedRequest, res) => {
  try {
    const enabledModules = await getOrganizationModules(req.organizationId!);
    res.json({
      enabledModules,
      monthlyAmount: computeMonthlyAmountFromModules(enabledModules),
      modules: JEWELLERY_MODULES.map((id) => ({
        id,
        label: MODULE_LABELS[id],
        monthlyPrice: MODULE_PRICING[id],
        enabled: enabledModules.includes(id),
      })),
    });
  } catch (error) {
    console.error("GET /api/billing/modules", error);
    res.status(500).json({ error: "Failed to fetch modules." });
  }
});

billingRouter.patch(
  "/modules",
  requireRole(canManageSettings),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { enabledModules } = req.body as { enabledModules: string[] };
      if (!Array.isArray(enabledModules)) {
        res.status(400).json({ error: "enabledModules must be an array." });
        return;
      }

      const normalized = await updateOrganizationModules(req.organizationId!, enabledModules);
      const subscription = await recalculateSubscriptionAmount(req.organizationId!);

      res.json({
        enabledModules: normalized,
        monthlyAmount: subscription.monthlyAmount,
        subscription,
      });
    } catch (error) {
      console.error("PATCH /api/billing/modules", error);
      res.status(500).json({ error: "Failed to update modules." });
    }
  },
);

billingRouter.post("/create-order", async (req: AuthenticatedRequest, res) => {
  try {
    if (!isRazorpayEnabled()) {
      res.status(503).json({ error: "Online payment is not configured." });
      return;
    }

    const billing = await getSubscriptionWithPayments(req.organizationId!);
    if (!billing) {
      res.status(404).json({ error: "Subscription not found." });
      return;
    }

    const amount = Number(billing.subscription.monthlyAmount);
    const order = await createSubscriptionOrder(req.organizationId!, amount);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getRazorpayKeyId(),
      monthlyAmount: amount,
      enabledModules: billing.subscription.enabledModules,
    });
  } catch (error) {
    console.error("POST /api/billing/create-order", error);
    res.status(500).json({ error: "Failed to create payment order." });
  }
});

billingRouter.post("/verify-payment", async (req: AuthenticatedRequest, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: "Missing payment verification fields." });
      return;
    }

    const valid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );
    if (!valid) {
      res.status(400).json({ error: "Invalid payment signature." });
      return;
    }

    const billing = await getSubscriptionWithPayments(req.organizationId!);
    if (!billing) {
      res.status(404).json({ error: "Subscription not found." });
      return;
    }

    const result = await recordSubscriptionPayment(req.organizationId!, {
      amount: Number(billing.subscription.monthlyAmount),
      method: "Razorpay",
      recordedByName: req.user!.name,
      razorpayPaymentId: razorpay_payment_id,
      notes: `Order ${razorpay_order_id}`,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof SubscriptionError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/billing/verify-payment", error);
    res.status(500).json({ error: "Failed to verify payment." });
  }
});
