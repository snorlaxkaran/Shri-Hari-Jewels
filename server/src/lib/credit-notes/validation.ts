import { moneyToNumber, toMoney } from "../money.js";

export type InvoiceItemCreditContext = {
  id: string;
  amount: number;
};

export type ExistingCreditLine = {
  invoiceItemId: string;
  amount: number;
};

export const computeRemainingCreditableByItem = (
  invoiceItems: InvoiceItemCreditContext[],
  existingCredits: ExistingCreditLine[],
): Map<string, number> => {
  const remaining = new Map<string, number>();
  for (const item of invoiceItems) {
    remaining.set(item.id, item.amount);
  }
  for (const credit of existingCredits) {
    const current = remaining.get(credit.invoiceItemId);
    if (current == null) continue;
    remaining.set(
      credit.invoiceItemId,
      moneyToNumber(toMoney(current - credit.amount)),
    );
  }
  return remaining;
};

export type CreditNoteLineInput = {
  invoiceItemId: string;
  amount: number;
};

export class CreditNoteValidationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "CreditNoteValidationError";
  }
}

export const validateCreditNoteLines = (
  lines: CreditNoteLineInput[],
  remainingByItem: Map<string, number>,
): void => {
  if (lines.length === 0) {
    throw new CreditNoteValidationError("At least one line item is required.");
  }

  const requestedByItem = new Map<string, number>();
  for (const line of lines) {
    if (!line.invoiceItemId) {
      throw new CreditNoteValidationError("Each line must reference an invoice item.");
    }
    if (line.amount == null || line.amount <= 0) {
      throw new CreditNoteValidationError("Credit amount must be greater than zero.");
    }

    const remaining = remainingByItem.get(line.invoiceItemId);
    if (remaining == null) {
      throw new CreditNoteValidationError("Invoice item not found on this invoice.");
    }

    const nextRequested =
      (requestedByItem.get(line.invoiceItemId) ?? 0) + line.amount;
    requestedByItem.set(line.invoiceItemId, nextRequested);

    if (nextRequested > remaining + 0.001) {
      throw new CreditNoteValidationError(
        `Credit amount exceeds remaining creditable value for item (${remaining.toFixed(2)} available).`,
      );
    }
  }
};

export const deriveInvoiceCreditStatus = (
  invoiceTotal: number,
  creditedTotal: number,
): "None" | "Partial" | "Full" => {
  if (creditedTotal <= 0) return "None";
  if (creditedTotal >= invoiceTotal - 0.01) return "Full";
  return "Partial";
};

export const mapCreditStatusToInvoiceStatus = (
  creditStatus: "None" | "Partial" | "Full",
  previousStatus: string,
): string => {
  if (creditStatus === "Full") return "Fully Credited";
  if (creditStatus === "Partial") return "Partially Credited";
  return previousStatus === "Fully Credited" || previousStatus === "Partially Credited"
    ? previousStatus
    : previousStatus;
};
