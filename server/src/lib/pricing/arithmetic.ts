import {
  computePayableWithRoundOff,
  computeRetailGstBreakup,
} from "../invoices/gst.js";

/** Shared gram rounding for raw metal stock (2 decimal places). */
export const roundWeightGrams = (value: number) =>
  Math.round(value * 100) / 100;

export type MetalLotSlice = {
  id: string;
  lotNumber: string;
  weightGrams: number;
};

export type LotDeductionPlan = {
  deductions: Array<{ lot: MetalLotSlice; amount: number }>;
  remaining: number;
  totalDeducted: number;
};

/** Plan how to split a metal deduction across lots (largest lots first). */
export const planMetalLotDeductions = (
  lots: MetalLotSlice[],
  totalGrams: number,
): LotDeductionPlan => {
  let remaining = totalGrams;
  const deductions: Array<{ lot: MetalLotSlice; amount: number }> = [];

  for (const lot of lots) {
    if (remaining <= 0) break;
    const amount = roundWeightGrams(Math.min(lot.weightGrams, remaining));
    if (amount <= 0) continue;
    deductions.push({ lot, amount });
    remaining = roundWeightGrams(remaining - amount);
  }

  const totalDeducted = roundWeightGrams(
    deductions.reduce((sum, entry) => sum + entry.amount, 0),
  );

  return { deductions, remaining, totalDeducted };
};

/** After applying a plan, remaining lot weights should match expected balances. */
export const applyLotDeductionPlan = (
  lots: MetalLotSlice[],
  plan: LotDeductionPlan,
): MetalLotSlice[] => {
  const byId = new Map(lots.map((lot) => [lot.id, { ...lot }]));
  for (const { lot, amount } of plan.deductions) {
    const current = byId.get(lot.id);
    if (!current) continue;
    current.weightGrams = roundWeightGrams(current.weightGrams - amount);
  }
  return [...byId.values()];
};

/** Karigar metal issue loss (milligram precision). */
export const computeMetalIssueLossGrams = (
  issuedGrams: number,
  returnedGrams: number,
): number => Math.round((issuedGrams - returnedGrams) * 1000) / 1000;

/** Old gold / exchange credit value (rupees, 2 dp). */
export const computeExchangeValue = (
  netWeightGrams: number,
  ratePerGram: number,
): number => Math.round(netWeightGrams * ratePerGram * 100) / 100;

/** API XAU rate (INR base): grams of gold per 1 INR — same as metals-api rates.XAU. */
export const convertApiXauRateToGold22kPerGram = (
  xauPerInr: number,
): number => {
  const TROY_OZ_GRAMS = 31.1035;
  const goldPerGram = 1 / xauPerInr / TROY_OZ_GRAMS;
  return Math.round(goldPerGram * (22 / 24) * 100) / 100;
};

/** Invoice line: list price minus discount must equal deal price. */
export const assertSaleLineArithmetic = (input: {
  listPrice: number;
  discount: number;
  dealPrice: number;
}): void => {
  const expected = Math.round((input.listPrice - input.discount) * 100) / 100;
  if (Math.abs(expected - input.dealPrice) > 0.001) {
    throw new Error(
      `Sale line mismatch: list ${input.listPrice} - discount ${input.discount} = ${expected}, got deal ${input.dealPrice}`,
    );
  }
};

/** Full retail invoice: taxable + tax - roundOff = payable (paise-exact). */
export const computeRetailInvoiceTotal = (input: {
  taxableValue: number;
  shopState: string;
  placeOfSupply: string;
}) => {
  const gst = computeRetailGstBreakup(
    input.taxableValue,
    input.shopState,
    input.placeOfSupply,
  );
  const preRound = input.taxableValue + gst.cgst + gst.sgst + gst.igst;
  const { payable, roundOff } = computePayableWithRoundOff(preRound);

  return {
    ...gst,
    preRound,
    payable,
    roundOff,
    taxTotal: gst.cgst + gst.sgst + gst.igst,
  };
};
