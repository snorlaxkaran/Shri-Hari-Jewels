import crypto from "crypto";
import Razorpay from "razorpay";

export const isRazorpayEnabled = (): boolean =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

let client: Razorpay | null = null;

export const getRazorpay = (): Razorpay | null => {
  if (!isRazorpayEnabled()) return null;
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return client;
};

export const toPaise = (rupees: number): number => Math.round(rupees * 100);

type RazorpayQrResponse = {
  id: string;
  image_url: string;
};

export const createUpiQrCode = async (
  saleId: string,
  amountRupees: number,
  description: string,
): Promise<RazorpayQrResponse> => {
  const razorpay = getRazorpay();
  if (!razorpay) {
    throw new Error("Razorpay is not configured.");
  }

  const closeBy = Math.floor(Date.now() / 1000) + 30 * 60;

  const qr = (await razorpay.qrCode.create({
    type: "upi_qr",
    name: "Shree Hari Jewels",
    usage: "single_use",
    fixed_amount: true,
    payment_amount: toPaise(amountRupees),
    description,
    close_by: closeBy,
    notes: {
      sale_id: saleId,
    },
  })) as RazorpayQrResponse;

  return qr;
};

export const closeUpiQrCode = async (qrId: string): Promise<void> => {
  const razorpay = getRazorpay();
  if (!razorpay) return;
  try {
    await razorpay.qrCode.close(qrId);
  } catch {
    // QR may already be closed or paid
  }
};

type RazorpayPayment = {
  id: string;
  status: string;
};

export const findCapturedPaymentForQr = async (
  qrId: string,
): Promise<RazorpayPayment | null> => {
  const razorpay = getRazorpay();
  if (!razorpay) return null;

  const response = (await razorpay.qrCode.fetchAllPayments(qrId, {
    count: 10,
  })) as { items: RazorpayPayment[] };

  return response.items.find((p) => p.status === "captured") ?? null;
};

export const verifyWebhookSignature = (
  body: string,
  signature: string,
): boolean => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expected === signature;
};

export const extractSaleIdFromWebhook = (
  payload: Record<string, unknown>,
): string | null => {
  const payment = payload.payload as
    | { payment?: { entity?: { notes?: { sale_id?: string } } } }
    | undefined;
  const qrCode = payload.payload as
    | { qr_code?: { entity?: { notes?: { sale_id?: string } } } }
    | undefined;

  return (
    payment?.payment?.entity?.notes?.sale_id ??
    qrCode?.qr_code?.entity?.notes?.sale_id ??
    null
  );
};

export const extractPaymentIdFromWebhook = (
  payload: Record<string, unknown>,
): string | null => {
  const payment = payload.payload as
    | { payment?: { entity?: { id?: string } } }
    | undefined;

  return payment?.payment?.entity?.id ?? null;
};
