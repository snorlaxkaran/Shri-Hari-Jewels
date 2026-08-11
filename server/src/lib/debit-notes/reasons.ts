import type { DebitNoteReason } from "../../types.js";

export const DEBIT_NOTE_REASONS: Array<{
  value: DebitNoteReason;
  label: string;
}> = [
  { value: "VendorReturn", label: "Vendor Return" },
  { value: "BillingCorrection", label: "Billing Correction" },
  { value: "DefectiveGoods", label: "Defective Goods" },
  { value: "Other", label: "Other" },
];

export const isDebitNoteReason = (value: string): value is DebitNoteReason =>
  DEBIT_NOTE_REASONS.some((reason) => reason.value === value);
