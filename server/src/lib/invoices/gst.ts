/** Retail GST helpers — mirrors transfer-invoice-pdf.ts (1.5% CGST+SGST or 3% IGST). */
export const computeRetailGstBreakup = (
  taxableValue: number,
  shopState: string,
  placeOfSupply: string,
) => {
  const supply = placeOfSupply.trim().toLowerCase();
  const seller = shopState.trim().toLowerCase();
  const isIntraState = supply.length > 0 && supply === seller;

  if (isIntraState) {
    const cgst = Math.round(taxableValue * 0.015 * 100) / 100;
    const sgst = Math.round(taxableValue * 0.015 * 100) / 100;
    return { cgst, sgst, igst: 0, isIntraState: true };
  }

  const igst = Math.round(taxableValue * 0.03 * 100) / 100;
  return { cgst: 0, sgst: 0, igst, isIntraState: false };
};

export const computePayableWithRoundOff = (amount: number) => {
  const payable = Math.round(amount);
  const roundOff = Math.round((payable - amount) * 100) / 100;
  return { payable, roundOff };
};

export const defaultHsnForMetal = (metal: string): string => {
  if (metal === "Gold" || metal === "Rose Gold" || metal === "Platinum") {
    return "7113";
  }
  if (metal === "Silver") return "7114";
  return "7117";
};
