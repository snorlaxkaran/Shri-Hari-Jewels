import { prisma } from "../db.js";

/** Stub for government e-Invoice integration — configure GSP credentials in production. */
export const generateEInvoice = async (input: {
  organizationId: string;
  invoiceId: string;
  saleId?: string;
}) => {
  const settings = await prisma.shopSettings.findUnique({
    where: { organizationId: input.organizationId },
    select: { gstNumber: true },
  });

  if (!settings?.gstNumber) {
    return prisma.eInvoiceRecord.create({
      data: {
        organizationId: input.organizationId,
        invoiceId: input.invoiceId,
        saleId: input.saleId,
        status: "Skipped",
        errorMessage: "GST number not configured in shop settings.",
      },
    });
  }

  // Placeholder until GSP/ASP API credentials are configured
  return prisma.eInvoiceRecord.create({
    data: {
      organizationId: input.organizationId,
      invoiceId: input.invoiceId,
      saleId: input.saleId,
      status: "Pending",
      errorMessage:
        "e-Invoice GSP integration not configured. Set EINVOICE_GSP_URL and credentials.",
    },
  });
};

export const listEInvoiceRecords = async (organizationId: string) => {
  const rows = await prisma.eInvoiceRecord.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows;
};
