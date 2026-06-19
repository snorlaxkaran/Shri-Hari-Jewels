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

export const weightMismatchMessage = (
  actual: number,
  expected: number,
  label: string,
): string =>
  `${label}: expected ${expected.toFixed(2)}g but entered ${actual.toFixed(2)}g. Explain the difference to continue.`;
