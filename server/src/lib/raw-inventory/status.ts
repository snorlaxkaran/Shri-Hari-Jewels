import { StoneLotStatus } from "@prisma/client";
import type { StoneLotStatus as ApiStoneLotStatus } from "../../types.js";

/** Map DB enum to API string values the client expects */
export const toApiStoneLotStatus = (
  status: StoneLotStatus,
): ApiStoneLotStatus => {
  switch (status) {
    case StoneLotStatus.InStock:
      return "In Stock";
    case StoneLotStatus.Reserved:
      return "Reserved";
    default:
      return "Issued";
  }
};
