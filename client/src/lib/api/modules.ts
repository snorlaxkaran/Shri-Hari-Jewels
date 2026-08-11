import { api } from "./client";
import type { JewelleryModuleId } from "@/lib/onboarding/config";

export type ModulePricingInfo = {
  modules: Array<{
    id: JewelleryModuleId;
    label: string;
    monthlyPrice: number;
    enabled?: boolean;
  }>;
  enabledModules?: JewelleryModuleId[];
  monthlyAmount?: number;
};

export const fetchModulePricing = () =>
  api.get<ModulePricingInfo>("/api/billing/modules/pricing").then((r) => r.data);

export const fetchOrganizationModules = () =>
  api.get<ModulePricingInfo>("/api/billing/modules").then((r) => r.data);

export const updateOrganizationModules = (enabledModules: JewelleryModuleId[]) =>
  api
    .patch<{ enabledModules: JewelleryModuleId[]; monthlyAmount: string }>(
      "/api/billing/modules",
      { enabledModules },
    )
    .then((r) => r.data);

export type RazorpayOrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string | null;
  monthlyAmount: number;
  enabledModules?: JewelleryModuleId[];
};

export const createBillingOrder = () =>
  api.post<RazorpayOrderResponse>("/api/billing/create-order").then((r) => r.data);

export const verifyBillingPayment = (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => api.post("/api/billing/verify-payment", payload).then((r) => r.data);

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
