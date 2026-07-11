export type AgeingThresholds = {
  amberDays: number;
  redDays: number;
};

export const DEFAULT_AGEING_THRESHOLDS: AgeingThresholds = {
  amberDays: 30,
  redDays: 90,
};

export type AgeingLevel = "neutral" | "ageing" | "aged";

export const getAgeInDays = (createdAt: string, now = new Date()): number => {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  const diffMs = now.getTime() - created.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

export const getAgeingLevel = (
  createdAt: string,
  thresholds: AgeingThresholds = DEFAULT_AGEING_THRESHOLDS,
  now = new Date(),
): AgeingLevel => {
  const days = getAgeInDays(createdAt, now);
  if (days > thresholds.redDays) return "aged";
  if (days > thresholds.amberDays) return "ageing";
  return "neutral";
};

export const formatAgeInDays = (days: number): string =>
  days === 1 ? "1 day" : `${days} days`;

export type UnitAgeingSource = {
  createdAt: string;
  branchTransferredAt?: string | null;
};

/** Age from HO transfer date when at a branch; otherwise from unit creation. */
export const getUnitAgeingDate = (unit: UnitAgeingSource): string =>
  unit.branchTransferredAt ?? unit.createdAt;
