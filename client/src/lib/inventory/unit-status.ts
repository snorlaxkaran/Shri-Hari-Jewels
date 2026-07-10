import type { InventoryUnitStatus } from "@/lib/types";

export const formatUnitStatusLabel = (status: InventoryUnitStatus | string): string => {
  if (status === "PendingVerification") return "Inactive";
  return status;
};

export const isInactiveUnit = (status: InventoryUnitStatus | string): boolean =>
  status === "PendingVerification";
