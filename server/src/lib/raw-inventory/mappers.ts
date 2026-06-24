import type { MetalLot as DbMetalLot, CertifiedStoneLot as DbCertifiedStoneLot } from "@prisma/client";
import type { MetalLot, StoneLot } from "../../types.js";
import { moneyToNumber, multiplyMoney } from "../money.js";
import { toApiStoneLotStatus } from "./status.js";

export const toMetalLot = (row: DbMetalLot): MetalLot => ({
  id: row.id,
  lotNumber: row.lotNumber,
  metalType: row.metalType as MetalLot["metalType"],
  purity: row.purity as MetalLot["purity"],
  weightGrams: row.weightGrams,
  purchaseRate: moneyToNumber(row.purchaseRate),
  currentRate: moneyToNumber(row.currentRate),
  vendor: row.vendor,
  location: row.location,
  notes: row.notes ?? undefined,
  stockValue: moneyToNumber(multiplyMoney(row.weightGrams, row.currentRate)),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const toStoneLot = (row: DbCertifiedStoneLot): StoneLot => ({
  id: row.id,
  certificateNumber: row.certificateNumber,
  stoneType: row.stoneType as StoneLot["stoneType"],
  carat: row.carat,
  color: row.color ?? undefined,
  clarity: row.clarity ?? undefined,
  cut: row.cut ?? undefined,
  vendor: row.vendor,
  purchaseRate:
    row.purchaseRate != null ? moneyToNumber(row.purchaseRate) : undefined,
  currentRate:
    row.currentRate != null ? moneyToNumber(row.currentRate) : undefined,
  location: row.location,
  status: toApiStoneLotStatus(row.status),
  notes: row.notes ?? undefined,
  stockValue:
    row.currentRate != null
      ? moneyToNumber(multiplyMoney(row.carat, row.currentRate))
      : undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
