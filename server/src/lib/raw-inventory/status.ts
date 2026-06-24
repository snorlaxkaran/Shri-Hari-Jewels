import { CertifiedStoneLotStatus } from "@prisma/client";
import type { StoneLotStatus as ApiStoneLotStatus } from "../../types.js";

/** Map DB enum to API string values the client expects */
export const toApiStoneLotStatus = (
  status: CertifiedStoneLotStatus,
): ApiStoneLotStatus => {
  switch (status) {
    case CertifiedStoneLotStatus.InStock:
      return "In Stock";
    case CertifiedStoneLotStatus.Reserved:
      return "Reserved";
    default:
      return "Issued";
  }
};
