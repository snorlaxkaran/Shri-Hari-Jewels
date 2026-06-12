import type { MetalLot, StoneLot } from "../../types.js";

type MetalRow = {
  id: string;
  lotNumber: string;
  metalType: string;
  purity: string;
  weightGrams: number;
  purchaseRate: number;
  currentRate: number;
  vendor: string;
  location: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type StoneRow = {
  id: string;
  certificateNumber: string;
  stoneType: string;
  carat: number;
  color: string | null;
  clarity: string | null;
  cut: string | null;
  vendor: string;
  purchaseRate: number | null;
  currentRate: number | null;
  location: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const toMetalLot = (row: MetalRow): MetalLot => ({
  id: row.id,
  lotNumber: row.lotNumber,
  metalType: row.metalType as MetalLot["metalType"],
  purity: row.purity as MetalLot["purity"],
  weightGrams: row.weightGrams,
  purchaseRate: row.purchaseRate,
  currentRate: row.currentRate,
  vendor: row.vendor,
  location: row.location,
  notes: row.notes ?? undefined,
  stockValue: row.weightGrams * row.currentRate,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const toStoneLot = (row: StoneRow): StoneLot => ({
  id: row.id,
  certificateNumber: row.certificateNumber,
  stoneType: row.stoneType as StoneLot["stoneType"],
  carat: row.carat,
  color: row.color ?? undefined,
  clarity: row.clarity ?? undefined,
  cut: row.cut ?? undefined,
  vendor: row.vendor,
  purchaseRate: row.purchaseRate ?? undefined,
  currentRate: row.currentRate ?? undefined,
  location: row.location,
  status: row.status as StoneLot["status"],
  notes: row.notes ?? undefined,
  stockValue:
    row.currentRate != null ? row.carat * row.currentRate : undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
