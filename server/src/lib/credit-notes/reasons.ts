import type { CreditNoteReason } from "../../types.js";

export const CREDIT_NOTE_REASONS: Array<{
  value: CreditNoteReason;
  label: string;
}> = [
  { value: "SalesReturn", label: "Sales Return" },
  { value: "PostSaleDiscount", label: "Post-Sale Discount" },
  { value: "RateQuantityCorrection", label: "Rate/Quantity Correction" },
  {
    value: "EInvoiceCancellationSubstitute",
    label: "E-Invoice Cancellation Substitute",
  },
  { value: "Other", label: "Other" },
];

export const CREDIT_NOTE_REFUND_MODES = [
  { value: "Cash", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BankTransfer", label: "Bank Transfer" },
  { value: "AdjustFutureSale", label: "Adjust Against Future Sale" },
] as const;

export const isCreditNoteReason = (value: string): value is CreditNoteReason =>
  CREDIT_NOTE_REASONS.some((reason) => reason.value === value);

export const isCreditNoteRefundMode = (
  value: string,
): value is (typeof CREDIT_NOTE_REFUND_MODES)[number]["value"] =>
  CREDIT_NOTE_REFUND_MODES.some((mode) => mode.value === value);
