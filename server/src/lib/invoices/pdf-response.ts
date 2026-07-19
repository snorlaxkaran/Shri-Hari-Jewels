import type { Response } from "express";
import { prisma } from "../db.js";
import { getCustomer } from "../customers/service.js";
import { generateInvoicePdf } from "./pdf.js";
import { getShopSettings } from "../settings/service.js";
import { toInvoice } from "./mappers.js";
import { ensureInvoiceRecordsComplete } from "./backfill-invoice-items.js";

export const sendInvoicePdfResponse = async (
  invoiceId: string,
  res: Response,
): Promise<boolean> => {
  const invoiceRow = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: true,
      branch: { select: { organizationId: true, id: true, name: true, address: true } },
    },
  });

  if (!invoiceRow) return false;

  const organizationId = invoiceRow.branch.organizationId;
  const completed = await ensureInvoiceRecordsComplete(invoiceRow, organizationId);
  const invoice = toInvoice(completed);
  const settings = await getShopSettings(organizationId);
  const customerBilling = invoice.customerId
    ? await getCustomer(invoice.customerId, organizationId)
    : null;

  const pdf = await generateInvoicePdf(
    invoice,
    settings,
    customerBilling,
    organizationId,
    invoiceRow.branch,
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${invoice.invoiceNo}.pdf"`,
  );
  res.send(pdf);
  return true;
};
