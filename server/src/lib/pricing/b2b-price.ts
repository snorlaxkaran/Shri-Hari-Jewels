export type SellingPriceInput = {
  weightGrams: number;
  metal: "Gold" | "Silver";
  makingChargesPct: number;
  marketRatePerGram: number;
  stoneCharges?: number;
};

export type SellingPriceBreakdown = {
  metalValue: number;
  makingCharges: number;
  stoneCharges: number;
  totalPrice: number;
  ratePerGram: number;
};

export const calculateSellingPrice = (
  input: SellingPriceInput,
): SellingPriceBreakdown => {
  const metalValue =
    Math.round(input.weightGrams * input.marketRatePerGram * 100) / 100;
  const makingCharges =
    Math.round(metalValue * (input.makingChargesPct / 100) * 100) / 100;
  const stoneCharges = input.stoneCharges ?? 0;
  const totalPrice = metalValue + makingCharges + stoneCharges;

  return {
    metalValue,
    makingCharges,
    stoneCharges,
    totalPrice,
    ratePerGram: input.marketRatePerGram,
  };
};

export const resolveMakingChargesPct = (
  metal: string,
  goldPct: number,
  silverPct: number,
): number => {
  if (metal === "Silver") return silverPct;
  return goldPct;
};

export const resolveMarketRateForProduct = (
  metal: string,
  purity: string,
  goldRate: number | null,
  silverRate: number | null,
): number | null => {
  if (metal === "Gold" && purity === "22K" && goldRate != null) return goldRate;
  if (metal === "Silver" && purity === "925" && silverRate != null) {
    return silverRate;
  }
  return null;
};
