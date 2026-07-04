import type {
  CertifiedStoneLotStatus,
  Purity,
  RawMetalType,
  RawStoneType,
} from "@/lib/types";

export const RAW_METAL_TYPES: RawMetalType[] = ["Gold", "Silver", "Platinum"];
export const RAW_STONE_TYPES: RawStoneType[] = [
  "Diamond",
  "Precious",
  "SemiPrecious",
];
export const RAW_PURITIES: Purity[] = ["24K", "22K", "18K", "14K", "925"];
export const STONE_STATUSES: CertifiedStoneLotStatus[] = [
  "In Stock",
  "Reserved",
  "Issued",
];
export const STOCK_LOCATIONS = [
  "Main Vault",
  "Workshop",
  "Showroom",
  "Off-site",
] as const;

export const STONE_TYPE_LABELS: Record<RawStoneType, string> = {
  Diamond: "Diamond",
  Precious: "Precious Stone",
  SemiPrecious: "Semi Precious",
};
