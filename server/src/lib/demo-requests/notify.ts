import nodemailer from "nodemailer";
import { isEmailConfigured } from "../email/service.js";

export type DemoRequestPayload = {
  businessName: string;
  contactName: string;
  phone: string;
  email: string | null;
  city: string | null;
  businessType: string | null;
  message: string | null;
};

const normalizeWhatsAppDigits = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

export const getPlatformDemoWhatsAppNumber = (): string | null => {
  const raw =
    process.env.PLATFORM_DEMO_WHATSAPP ?? process.env.PLATFORM_CONTACT_WHATSAPP;
  if (!raw?.trim()) return null;
  const digits = normalizeWhatsAppDigits(raw);
  return digits.length >= 10 ? digits : null;
};

export const buildDemoRequestWhatsAppMessage = (
  payload: DemoRequestPayload,
): string => {
  const lines = [
    "Hi, I'd like to request a demo of Shri Hari Jewels ERP.",
    "",
    `Business: ${payload.businessName}`,
    `Contact: ${payload.contactName}`,
    `Phone: ${payload.phone}`,
  ];
  if (payload.email) lines.push(`Email: ${payload.email}`);
  if (payload.city) lines.push(`City: ${payload.city}`);
  if (payload.businessType) lines.push(`Type: ${payload.businessType}`);
  if (payload.message) lines.push("", payload.message);
  return lines.join("\n");
};

export const buildDemoRequestWhatsAppUrl = (
  payload: DemoRequestPayload,
): string | null => {
  const number = getPlatformDemoWhatsAppNumber();
  if (!number) return null;
  const text = buildDemoRequestWhatsAppMessage(payload);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
};

export const notifyDemoRequestByEmail = async (
  payload: DemoRequestPayload,
): Promise<void> => {
  const to = process.env.PLATFORM_DEMO_EMAIL ?? process.env.PLATFORM_CONTACT_EMAIL;
  if (!to?.trim() || !isEmailConfigured()) return;

  const host = process.env.SMTP_HOST!;
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const from = process.env.SMTP_FROM ?? user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const body = buildDemoRequestWhatsAppMessage(payload);
  await transporter.sendMail({
    from,
    to: to.trim(),
    subject: `New demo request — ${payload.businessName}`,
    text: body,
  });
};
