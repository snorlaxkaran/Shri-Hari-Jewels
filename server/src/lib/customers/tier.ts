import type { CustomerTier } from "../../types.js";

export const getCustomerTier = (totalSpent: number): CustomerTier => {
  if (totalSpent >= 1_000_000) return "Platinum";
  if (totalSpent >= 500_000) return "Gold";
  if (totalSpent >= 100_000) return "Silver";
  return "Bronze";
};
