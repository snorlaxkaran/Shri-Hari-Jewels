import { logger } from "../logger.js";
import { SmsDeliveryError } from "./errors.js";
import { isTwilioVerifyConfigured, sendTwilioVerifyOtp } from "./twilio-verify.js";

export { SmsDeliveryError } from "./errors.js";

const e164India = (phone10: string): string => `91${phone10}`;

const formatTwilioError = (message: string, code?: number): string => {
  if (message === "Authenticate" || code === 20003) {
    return "Twilio login failed — check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN on the server.";
  }
  if (code === 572006) {
    return "Twilio trial requires template sms_2fa — set TWILIO_SMS_TEMPLATE=sms_2fa on the server.";
  }
  if (code === 21608 || message.toLowerCase().includes("unverified")) {
    return "Twilio trial: add this phone number under Verified Caller IDs in Twilio console.";
  }
  return message || "Could not send SMS via Twilio.";
};

/** Fast2SMS — DLT OTP template API (recommended for production in India). */
const sendViaFast2SmsTemplate = async (
  apiKey: string,
  phone: string,
  code: string,
): Promise<void> => {
  const otpId = process.env.FAST2SMS_OTP_ID?.trim();
  if (!otpId) {
    throw new SmsDeliveryError("FAST2SMS_OTP_ID is not configured.");
  }

  const response = await fetch("https://www.fast2sms.com/dev/otp/send", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      mobile: phone,
      otp_id: otpId,
      otp: code,
      otp_length: 6,
      otp_expiry: 10,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { return?: boolean; message?: string | string[]; status_code?: number }
    | null;

  if (!response.ok || payload?.return === false) {
    const detail = Array.isArray(payload?.message)
      ? payload.message.join(", ")
      : payload?.message ?? response.statusText;
    logger.error({ phone, detail, status: response.status }, "Fast2SMS OTP template failed");
    throw new SmsDeliveryError("Could not send SMS. Check Fast2SMS DLT OTP template setup.");
  }

  logger.info({ phone }, "Trial OTP sent via Fast2SMS (DLT template)");
};

/** Fast2SMS legacy bulk route — works without otp_id but may fail without DLT approval. */
const sendViaFast2SmsLegacy = async (
  apiKey: string,
  phone: string,
  code: string,
): Promise<void> => {
  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      route: "otp",
      numbers: phone,
      variables_values: code,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { return?: boolean; message?: string | string[]; status_code?: number }
    | null;

  if (!response.ok || payload?.return === false) {
    const detail = Array.isArray(payload?.message)
      ? payload.message.join(", ")
      : payload?.message ?? response.statusText;
    logger.error({ phone, detail, status: response.status }, "Fast2SMS OTP failed");
    throw new SmsDeliveryError("Could not send SMS. Add FAST2SMS_OTP_ID for DLT delivery.");
  }

  logger.info({ phone }, "Trial OTP sent via Fast2SMS");
};

/** Fast2SMS — popular in India; prefers DLT template API when FAST2SMS_OTP_ID is set. */
const sendViaFast2Sms = async (phone: string, code: string): Promise<void> => {
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  if (!apiKey) {
    throw new SmsDeliveryError("FAST2SMS_API_KEY is not configured.");
  }

  if (process.env.FAST2SMS_OTP_ID?.trim()) {
    await sendViaFast2SmsTemplate(apiKey, phone, code);
    return;
  }

  await sendViaFast2SmsLegacy(apiKey, phone, code);
};

/** MSG91 OTP API — requires template_id with ##OTP## placeholder. */
const sendViaMsg91 = async (phone: string, code: string): Promise<void> => {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID?.trim();
  if (!authKey || !templateId) {
    throw new SmsDeliveryError("MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID are required.");
  }

  const response = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: {
      authkey: authKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      template_id: templateId,
      mobile: e164India(phone),
      otp: code,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { type?: string; message?: string }
    | null;

  if (!response.ok || payload?.type === "error") {
    logger.error(
      { phone, detail: payload?.message, status: response.status },
      "MSG91 OTP failed",
    );
    throw new SmsDeliveryError(payload?.message ?? "Could not send SMS via MSG91.");
  }

  logger.info({ phone }, "Trial OTP sent via MSG91");
};

const TWILIO_TRIAL_TEMPLATES = new Set([
  "sms_2fa",
  "sms_appointment_reminders",
  "sms_order_confirmation",
  "sms_delivery_updates",
  "sms_customer_support",
  "sms_marketing_promotions",
  "sms_event_notifications",
  "sms_account_alerts",
  "sms_feedback_surveys",
  "sms_internal_alerts",
]);

const normalizeTwilioFrom = (raw: string): string => {
  const from = raw.trim();
  if (from.startsWith("+")) return from;
  const digits = from.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
};

const resolveTwilioTrialTemplate = (): string => {
  const configured = (process.env.TWILIO_SMS_TEMPLATE ?? "sms_2fa").trim().toLowerCase();
  if (TWILIO_TRIAL_TEMPLATES.has(configured)) return configured;
  logger.warn({ configured }, "Invalid TWILIO_SMS_TEMPLATE — falling back to sms_2fa");
  return "sms_2fa";
};

export const isTwilioConfigured = (): boolean =>
  Boolean(process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim());

/** Twilio trial: predefined template (sms_2fa) — Twilio generates OTP, returned in API response. */
export const sendTwilioTrialTemplateOtp = async (phone: string): Promise<string> => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromRaw = process.env.TWILIO_SMS_FROM?.trim();
  const template = resolveTwilioTrialTemplate();

  if (!accountSid || !authToken) {
    throw new SmsDeliveryError("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required.");
  }
  if (!fromRaw) {
    throw new SmsDeliveryError(
      "TWILIO_SMS_FROM is required (e.g. +17372212163). Trial accounts must use template sms_2fa.",
    );
  }

  const from = normalizeTwilioFrom(fromRaw);
  const params = new URLSearchParams({
    To: `+${e164India(phone)}`,
    From: from,
    Body: template,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { sid?: string; body?: string; message?: string; code?: number }
    | null;

  if (!response.ok) {
    const twilioMessage = payload?.message ?? response.statusText;
    logger.error(
      { phone, detail: twilioMessage, code: payload?.code, status: response.status },
      "Twilio trial template SMS failed",
    );
    throw new SmsDeliveryError(formatTwilioError(twilioMessage, payload?.code));
  }

  const sentBody = payload?.body ?? "";
  const otpMatch = sentBody.match(/\b(\d{6})\b/);
  if (!otpMatch) {
    logger.error({ phone, sentBody }, "Twilio trial template did not return OTP in response");
    throw new SmsDeliveryError("SMS sent but OTP code was not received. Try again.");
  }

  logger.info({ phone, sid: payload?.sid, template }, "Trial OTP sent via Twilio trial template");
  return otpMatch[1];
};

export const isTwilioTrialTemplateConfigured = (): boolean =>
  isTwilioConfigured() && Boolean(process.env.TWILIO_SMS_FROM?.trim());

/** @deprecated Trial accounts must use sendTwilioTrialTemplateOtp — custom bodies are blocked. */
const sendViaTwilioCustom = async (phone: string, code: string): Promise<void> => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_SMS_FROM?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (!accountSid || !authToken) {
    throw new SmsDeliveryError("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required.");
  }
  if (!from && !messagingServiceSid) {
    throw new SmsDeliveryError(
      "Set TWILIO_SMS_FROM (phone number) or TWILIO_MESSAGING_SERVICE_SID.",
    );
  }

  const body = new URLSearchParams({
    To: `+${e164India(phone)}`,
    Body: `Your Shri Hari Jewels verification code is ${code}. Valid for 10 minutes. Do not share this code.`,
  });
  if (messagingServiceSid) {
    body.set("MessagingServiceSid", messagingServiceSid);
  } else if (from) {
    body.set("From", from);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { sid?: string; message?: string; code?: number }
    | null;

  if (!response.ok) {
    const twilioMessage = payload?.message ?? response.statusText;
    logger.error(
      { phone, detail: twilioMessage, code: payload?.code, status: response.status },
      "Twilio SMS failed",
    );
    throw new SmsDeliveryError(formatTwilioError(twilioMessage, payload?.code));
  }

  logger.info({ phone, sid: payload?.sid }, "Trial OTP sent via Twilio");
};

/**
 * Send a 6-digit OTP to an Indian mobile (10 digits, no country code).
 * Set SMS_PROVIDER to twilio | fast2sms | msg91
 */
export const sendOtpSms = async (phone: string, code: string): Promise<void> => {
  const provider = (process.env.SMS_PROVIDER ?? "twilio").trim().toLowerCase();

  switch (provider) {
    case "fast2sms":
      await sendViaFast2Sms(phone, code);
      return;
    case "msg91":
      await sendViaMsg91(phone, code);
      return;
    case "twilio":
      if (process.env.TWILIO_USE_VERIFY === "true" && isTwilioVerifyConfigured()) {
        await sendTwilioVerifyOtp(phone);
        return;
      }
      if (process.env.TWILIO_SMS_MODE === "custom") {
        await sendViaTwilioCustom(phone, code);
        return;
      }
      throw new SmsDeliveryError(
        "Twilio OTP must use sendTwilioTrialTemplateOtp() with TWILIO_SMS_TEMPLATE=sms_2fa.",
      );
    case "none":
    case "log":
      logger.warn({ phone }, "SMS_PROVIDER=log — OTP not sent to phone");
      return;
    default:
      throw new SmsDeliveryError(`Unknown SMS_PROVIDER: ${provider}`);
  }
};

export const isSmsConfigured = (): boolean => {
  const provider = (process.env.SMS_PROVIDER ?? "twilio").trim().toLowerCase();
  switch (provider) {
    case "fast2sms":
      return Boolean(process.env.FAST2SMS_API_KEY?.trim());
    case "msg91":
      return Boolean(
        process.env.MSG91_AUTH_KEY?.trim() && process.env.MSG91_OTP_TEMPLATE_ID?.trim(),
      );
    case "twilio":
      return isTwilioTrialTemplateConfigured() || isTwilioConfigured();
    case "none":
    case "log":
      return false;
    default:
      return false;
  }
};
