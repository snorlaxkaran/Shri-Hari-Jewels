import crypto from "node:crypto";
import { prisma } from "../db.js";
import { logger } from "../logger.js";
import { normalizeIndianPhone } from "./phone.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;

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

const generateCode = (): string =>
  String(crypto.randomInt(100000, 999999));

const shouldEchoOtp = (): boolean =>
  process.env.NODE_ENV !== "production" || process.env.TRIAL_OTP_ECHO === "true";

const deliverOtp = async (phone: string, code: string): Promise<void> => {
  logger.info({ phone, code: shouldEchoOtp() ? code : "[redacted]" }, "Trial OTP issued");
  // SMS provider hook — configure MSG91/Twilio when ready
};

export const sendTrialOtp = async (
  rawPhone: string,
): Promise<{ phone: string; devOtp?: string }> => {
  const phone = normalizeIndianPhone(rawPhone);
  if (!phone) {
    throw new TrialOtpError("Enter a valid 10-digit mobile number.");
  }

  const recent = await prisma.phoneOtpChallenge.findFirst({
    where: { phone, purpose: "trial" },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new TrialOtpError("Please wait a few seconds before requesting another code.", 429);
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.phoneOtpChallenge.deleteMany({ where: { phone, purpose: "trial" } });
  await prisma.phoneOtpChallenge.create({
    data: {
      phone,
      purpose: "trial",
      codeHash: hashCode(phone, code),
      expiresAt,
    },
  });

  await deliverOtp(phone, code);

  return {
    phone,
    ...(shouldEchoOtp() ? { devOtp: code } : {}),
  };
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

  const valid = hashCode(phone, code.trim()) === challenge.codeHash;
  if (!valid) {
    await prisma.phoneOtpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    throw new TrialOtpError("Incorrect code. Try again.");
  }

  await prisma.phoneOtpChallenge.delete({ where: { id: challenge.id } });
  return { phone };
};
