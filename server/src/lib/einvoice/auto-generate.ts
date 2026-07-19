import { logger } from "../logger.js";
import { maybeAutoGenerateEInvoice } from "./service.js";

export const queueAutoEInvoiceGeneration = (input: {
  organizationId: string;
  invoiceId: string;
  saleId?: string;
}): void => {
  void maybeAutoGenerateEInvoice(input).catch((error) => {
    logger.warn(
      {
        err: error instanceof Error ? error.message : error,
        invoiceId: input.invoiceId,
        organizationId: input.organizationId,
      },
      "[einvoice] Auto-generation failed",
    );
  });
};
