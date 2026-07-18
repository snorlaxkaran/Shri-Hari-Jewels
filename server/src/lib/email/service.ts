import nodemailer from "nodemailer";

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in server environment.",
    );
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

export const sendEmailWithAttachment = async (
  to: string,
  subject: string,
  body: string,
  attachmentBuffer: Buffer,
  attachmentName: string,
): Promise<void> => {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  if (!from) {
    throw new Error("SMTP_FROM or SMTP_USER must be set for outbound email.");
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to,
    subject,
    text: body,
    attachments: [
      {
        filename: attachmentName,
        content: attachmentBuffer,
        contentType: attachmentName.endsWith(".pdf")
          ? "application/pdf"
          : "application/octet-stream",
      },
    ],
  });
};

export const isEmailConfigured = (): boolean =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
