import {
  computePayableWithRoundOff,
  computeRetailGstBreakup,
} from "../invoices/gst.js";
import { moneyToNumber, sumMoney, toMoney } from "../money.js";

export type CreditNoteLineTotals = {
  listPrice: number;
  discount: number;
  amount: number;
};

export const scaleLineForPartialCredit = (
  invoiceLine: { listPrice: number; discount: number; amount: number },
  creditAmount: number,
): CreditNoteLineTotals => {
  if (creditAmount >= invoiceLine.amount) {
    return {
      listPrice: invoiceLine.listPrice,
      discount: invoiceLine.discount,
      amount: invoiceLine.amount,
    };
  }
  const ratio = creditAmount / invoiceLine.amount;
  return {
    listPrice: moneyToNumber(toMoney(invoiceLine.listPrice * ratio)),
    discount: moneyToNumber(toMoney(invoiceLine.discount * ratio)),
    amount: moneyToNumber(toMoney(creditAmount)),
  };
};

export const computeCreditNoteTotals = (
  lines: CreditNoteLineTotals[],
  shopState: string,
  placeOfSupply: string,
) => {
  const subtotal = sumMoney(lines.map((line) => line.listPrice));
  const discount = sumMoney(lines.map((line) => line.discount));
  const taxableValue = sumMoney(lines.map((line) => line.amount));
  const taxableNum = moneyToNumber(taxableValue);

  const gst = computeRetailGstBreakup(taxableNum, shopState, placeOfSupply);
  const preRound = taxableNum + gst.cgst + gst.sgst + gst.igst;
  const { payable, roundOff } = computePayableWithRoundOff(preRound);

  return {
    subtotal: moneyToNumber(subtotal),
    discount: moneyToNumber(discount),
    taxableValue: taxableNum,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: gst.igst,
    roundOff,
    total: payable,
    isIntraState: gst.isIntraState,
  };
};
