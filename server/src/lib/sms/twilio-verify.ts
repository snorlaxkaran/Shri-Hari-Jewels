import { logger } from "../logger.js";
import { SmsDeliveryError } from "./errors.js";

const e164India = (phone10: string): string => `+91${phone10}`;

const twilioAuth = (): { accountSid: string; authToken: string; serviceSid: string } => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  if (!accountSid || !authToken || !serviceSid) {
    throw new SmsDeliveryError(
      "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID are required.",
    );
  }
  return { accountSid, authToken, serviceSid };
};

const formatTwilioVerifyError = (message: string, code?: number): string => {
  if (message === "Authenticate" || code === 20003) {
    return "Twilio login failed — check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN on the server.";
  }
  if (code === 21608 || message.toLowerCase().includes("unverified")) {
    return "Twilio trial: verify this phone number at twilio.com/user/account/phone-numbers/verified";
  }
  return message || "Could not send verification SMS.";
};

const twilioFetch = async (
  path: string,
  body: URLSearchParams,
): Promise<{ ok: boolean; payload: Record<string, unknown> | null; status: number }> => {
  const { accountSid, authToken } = twilioAuth();
  const response = await fetch(`https://verify.twilio.com/v2${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: response.ok, payload, status: response.status };
};

/** Send OTP via Twilio Verify — works on trial accounts with verified numbers. */
export const sendTwilioVerifyOtp = async (phone: string): Promise<void> => {
  const { serviceSid } = twilioAuth();
  const { ok, payload, status } = await twilioFetch(
    `/Services/${serviceSid}/Verifications`,
    new URLSearchParams({ To: e164India(phone), Channel: "sms" }),
  );

  if (!ok) {
    const message = typeof payload?.message === "string" ? payload.message : "Verify send failed";
    const code = typeof payload?.code === "number" ? payload.code : undefined;
    logger.error({ phone, detail: message, code, status }, "Twilio Verify send failed");
    throw new SmsDeliveryError(formatTwilioVerifyError(message, code));
  }

  logger.info({ phone, status: payload?.status }, "Trial OTP sent via Twilio Verify");
};

/** Check OTP via Twilio Verify. */
export const checkTwilioVerifyOtp = async (phone: string, code: string): Promise<void> => {
  const { serviceSid } = twilioAuth();
  const { ok, payload, status } = await twilioFetch(
    `/Services/${serviceSid}/VerificationCheck`,
    new URLSearchParams({ To: e164India(phone), Code: code.trim() }),
  );

  const verifyStatus = typeof payload?.status === "string" ? payload.status : "";
  if (ok && verifyStatus === "approved") {
    logger.info({ phone }, "Twilio Verify OTP approved");
    return;
  }

  if (verifyStatus === "pending") {
    throw new SmsDeliveryError("Incorrect code. Try again.");
  }

  const message = typeof payload?.message === "string" ? payload.message : "Verification failed";
  const errCode = typeof payload?.code === "number" ? payload.code : undefined;
  logger.warn({ phone, detail: message, verifyStatus, status }, "Twilio Verify check failed");
  throw new SmsDeliveryError(formatTwilioVerifyError(message, errCode));
};

export const isTwilioVerifyConfigured = (): boolean =>
  Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_VERIFY_SERVICE_SID?.trim(),
  );
