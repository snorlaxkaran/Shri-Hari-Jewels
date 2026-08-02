import crypto from "node:crypto";
import { prisma } from "../db.js";
import {
  isSmsConfigured,
  isTwilioTrialTemplateConfigured,
  sendTwilioTrialTemplateOtp,
  SmsDeliveryError,
} from "../sms/send-otp.js";
import {
  checkTwilioVerifyOtp,
  isTwilioVerifyConfigured,
  sendTwilioVerifyOtp,
} from "../sms/twilio-verify.js";
import { normalizeIndianPhone } from "./phone.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 15 * 1000;
const TWILIO_VERIFY_MARKER = "twilio-verify";

export class TrialOtpError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "TrialOtpError";
  }
}

const hashCode = (phone: string, code: string): string =>
  crypto.createHash("sha256").update(`${phone}:${code}:${process.env.JWT_SECRET ?? "dev"}`).digest("hex");

const useTwilioVerify = (): boolean =>
  process.env.TWILIO_USE_VERIFY === "true" &&
  (process.env.SMS_PROVIDER ?? "twilio").trim().toLowerCase() === "twilio" &&
  isTwilioVerifyConfigured();

const resolveOtpCode = async (phone: string): Promise<string> => {
  const provider = (process.env.SMS_PROVIDER ?? "twilio").trim().toLowerCase();

  if (provider === "twilio") {
    if (useTwilioVerify()) {
      await sendTwilioVerifyOtp(phone);
      return TWILIO_VERIFY_MARKER;
    }
    if (!isTwilioTrialTemplateConfigured()) {
      throw new SmsDeliveryError(
        "Set TWILIO_SMS_FROM=+17372212163 and TWILIO_SMS_TEMPLATE=sms_2fa on the server.",
      );
    }
    return await sendTwilioTrialTemplateOtp(phone);
  }

  const code = String(crypto.randomInt(100000, 999999));
  const { sendOtpSms } = await import("../sms/send-otp.js");
  await sendOtpSms(phone, code);
  return code;
};

export const sendTrialOtp = async (rawPhone: string): Promise<{ phone: string }> => {
  const phone = normalizeIndianPhone(rawPhone);
  if (!phone) {
    throw new TrialOtpError("Enter a valid 10-digit mobile number.");
  }

  if (!isSmsConfigured()) {
    throw new TrialOtpError(
      "SMS is not configured on the server. Contact support or try again later.",
      503,
    );
  }

  const recent = await prisma.phoneOtpChallenge.findFirst({
    where: { phone, purpose: "trial" },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil(
      (RESEND_COOLDOWN_MS - (Date.now() - recent.createdAt.getTime())) / 1000,
    );
    throw new TrialOtpError(`Please wait ${waitSec}s before requesting another code.`, 429);
  }

  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.phoneOtpChallenge.deleteMany({ where: { phone, purpose: "trial" } });

  let codeOrMarker: string;
  try {
    codeOrMarker = await resolveOtpCode(phone);
  } catch (error) {
    if (error instanceof SmsDeliveryError) {
      throw new TrialOtpError(error.message, 503);
    }
    throw error;
  }

  await prisma.phoneOtpChallenge.create({
    data: {
      phone,
      purpose: "trial",
      codeHash:
        codeOrMarker === TWILIO_VERIFY_MARKER
          ? TWILIO_VERIFY_MARKER
          : hashCode(phone, codeOrMarker),
      expiresAt,
    },
  });

  return { phone };
};

export const verifyTrialOtp = async (
  rawPhone: string,
  code: string,
): Promise<{ phone: string }> => {
  const phone = normalizeIndianPhone(rawPhone);
  if (!phone) {
    throw new TrialOtpError("Enter a valid 10-digit mobile number.");
  }
  if (!/^\d{6}$/.test(code.trim())) {
    throw new TrialOtpError("Enter the 6-digit code.");
  }

  const challenge = await prisma.phoneOtpChallenge.findFirst({
    where: { phone, purpose: "trial" },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge || challenge.expiresAt < new Date()) {
    throw new TrialOtpError("Code expired. Request a new one.");
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    throw new TrialOtpError("Too many attempts. Request a new code.", 429);
  }

  if (challenge.codeHash === TWILIO_VERIFY_MARKER) {
    try {
      await checkTwilioVerifyOtp(phone, code);
    } catch (error) {
      if (error instanceof SmsDeliveryError) {
        await prisma.phoneOtpChallenge.update({
          where: { id: challenge.id },
          data: { attempts: { increment: 1 } },
        });
        throw new TrialOtpError(error.message, 400);
      }
      throw error;
    }
  } else {
    const valid = hashCode(phone, code.trim()) === challenge.codeHash;
    if (!valid) {
      await prisma.phoneOtpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new TrialOtpError("Incorrect code. Try again.");
    }
  }

  await prisma.phoneOtpChallenge.delete({ where: { id: challenge.id } });
  return { phone };
};
