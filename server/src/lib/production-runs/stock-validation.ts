import { ProductionRunError } from "./errors.js";

export const assertMetalLotHasGrams = (
  lot: { lotNumber: string; weightGrams: number },
  requiredGrams: number,
  context = "for this operation",
): void => {
  if (lot.weightGrams + 0.001 < requiredGrams) {
    throw new ProductionRunError(
      `Insufficient metal in lot ${lot.lotNumber}: need ${requiredGrams}g ${context}, have ${lot.weightGrams}g.`,
    );
  }
};

export const assertStoneLotHasCarats = (
  lot: { certificateNumber: string; carat: number },
  requiredCarats: number,
): void => {
  if (lot.carat + 0.001 < requiredCarats) {
    throw new ProductionRunError(
      `Insufficient carats in lot ${lot.certificateNumber}: need ${requiredCarats}ct, have ${lot.carat}ct.`,
    );
  }
};
