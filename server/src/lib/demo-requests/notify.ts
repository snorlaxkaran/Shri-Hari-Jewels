import { prisma } from "../db.js";
import { isEmailConfigured, sendPlainEmail } from "../email/service.js";
import { createNotification } from "../notifications/service.js";

export type DemoRequestPayload = {
  businessName: string;
  contactName: string;
  phone: string;
  email: string | null;
  city: string | null;
  businessType: string | null;
  message: string | null;
};

const DEFAULT_PLATFORM_ADMIN_EMAIL = "admin@karan.com";

export const formatDemoRequestBody = (payload: DemoRequestPayload): string => {
  const lines = [
    "New demo request from the onboarding page.",
    "",
    `Business: ${payload.businessName}`,
    `Contact: ${payload.contactName}`,
    `Phone: ${payload.phone}`,
  ];
  if (payload.email) lines.push(`Email: ${payload.email}`);
  if (payload.city) lines.push(`City: ${payload.city}`);
  if (payload.businessType) lines.push(`Type: ${payload.businessType}`);
  if (payload.message) lines.push("", "Message:", payload.message);
  lines.push("", "View in ERP: /platform/demo-requests");
  return lines.join("\n");
};

const getPlatformAdminRecipients = async (): Promise<
  { id: string; email: string }[]
> => {
  const admins = await prisma.user.findMany({
    where: { role: "SuperAdmin", active: true },
    select: { id: true, email: true },
  });

  if (admins.length > 0) return admins;

  const fallback =
    process.env.PLATFORM_DEMO_EMAIL?.trim() ?? DEFAULT_PLATFORM_ADMIN_EMAIL;
  return [{ id: "", email: fallback }];
};

export const notifyPlatformAdminsOfDemoRequest = async (
  payload: DemoRequestPayload,
): Promise<void> => {
  const recipients = await getPlatformAdminRecipients();
  const title = `New demo request — ${payload.businessName}`;
  const message = `${payload.contactName} · ${payload.phone}`;
  const body = formatDemoRequestBody(payload);

  await Promise.all(
    recipients
      .filter((admin) => admin.id)
      .map((admin) =>
        createNotification({
          userId: admin.id,
          type: "demo_request",
          title,
          message,
          link: "/platform/demo-requests",
        }),
      ),
  );

  if (!isEmailConfigured()) {
    console.warn(
      "Demo request saved but email not sent — configure SMTP_HOST, SMTP_USER, and SMTP_PASS.",
    );
    return;
  }

  const emails = [...new Set(recipients.map((admin) => admin.email))];
  await Promise.all(
    emails.map((to) =>
      sendPlainEmail(to, title, body).catch((err) => {
        console.error(`Demo request email to ${to} failed`, err);
      }),
    ),
  );
};
