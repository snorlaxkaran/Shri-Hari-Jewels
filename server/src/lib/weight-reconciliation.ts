/** Allowed scale/casting variance before an explicit override note is required. */
export const WEIGHT_TOLERANCE_GRAMS = 0.1;

export const weightsMatch = (
  actual: number,
  expected: number,
  tolerance = WEIGHT_TOLERANCE_GRAMS,
): boolean => Math.abs(actual - expected) <= tolerance;

export const expectedElementWeight = (
  weightGramsPerPc: number | null | undefined,
  qtyPerSet: number,
): number => (weightGramsPerPc ?? 0) * qtyPerSet;

export const requireWeightOverrideNote = (
  actual: number,
  expected: number,
  note: string | undefined | null,
  label: string,
): void => {
  if (weightsMatch(actual, expected)) return;
  const trimmed = note?.trim();
  if (!trimmed) {
    throw new Error(
      `${label}: expected ${expected.toFixed(2)}g but got ${actual.toFixed(2)}g. Enter a reason to save this weight.`,
    );
  }
};
