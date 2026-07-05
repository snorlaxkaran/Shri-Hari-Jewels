import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import { getLatestMotifPriceChange } from "./audit.js";
import {
  calculateMotifPrice,
  getMotif,
} from "../motifs/service.js";
import { getStoneTypeAvgRate } from "../raw-inventory/stone-stock-service.js";
import type {
  DesignElementPriceDrift,
  MotifMetal,
  MotifPriceDrift,
  Purity,
} from "../../types.js";

export const getDesignPriceDrift = async (
  designId: string,
  organizationId: string,
): Promise<DesignElementPriceDrift[]> => {
  const design = await prisma.design.findUnique({
    where: { id: designId, branch: { organizationId } },
    include: { elements: true },
  });
  if (!design) return [];

  const drifts: DesignElementPriceDrift[] = [];

  for (const element of design.elements) {
    if (!element.motifId || element.unitValue == null) continue;

    const motif = await getMotif(element.motifId, organizationId);
    const snapshot = moneyToNumber(String(element.unitValue));
    const live = motif.price ?? 0;

    if (Math.abs(snapshot - live) < 0.0001) continue;

    const lastChange = await getLatestMotifPriceChange(element.motifId);

    drifts.push({
      elementId: element.id,
      elementName: element.name,
      motifId: element.motifId,
      motifName: motif.name,
      snapshotUnitValue: snapshot,
      liveMotifPrice: live,
      lastMotifPriceChange: lastChange,
    });
  }

  return drifts;
};

export const getMotifPriceDrift = async (
  motifId: string,
  organizationId: string,
): Promise<MotifPriceDrift | null> => {
  const motif = await prisma.motif.findFirst({
    where: { id: motifId, branch: { organizationId } },
    include: { stones: true },
  });
  if (!motif) return null;

  const stones = motif.stones.map((s) => ({
    stoneType: s.stoneType,
    qtyPerMotif: s.qtyPerMotif,
    sortOrder: s.sortOrder,
  }));

  const calculatedPrice = await calculateMotifPrice({
    weightGrams: motif.weightGrams,
    metal: motif.metal as MotifMetal,
    purity: motif.purity as Purity,
    stones,
    organizationId,
  });
  const storedPrice =
    motif.price != null ? moneyToNumber(String(motif.price)) : 0;

  const staleStoneStock = await Promise.all(
    motif.stones.map(async (s) => ({
      stoneType: s.stoneType,
      livePricePerStone: await getStoneTypeAvgRate(s.stoneType, organizationId),
      qtyPerMotif: s.qtyPerMotif,
    })),
  ).then((rows) =>
    rows.filter(() => Math.abs(storedPrice - calculatedPrice) >= 0.0001),
  );

  if (
    Math.abs(storedPrice - calculatedPrice) < 0.0001 &&
    staleStoneStock.length === 0
  ) {
    return null;
  }

  return {
    motifId,
    motifName: motif.name,
    storedPrice,
    calculatedPrice,
    isStale: Math.abs(storedPrice - calculatedPrice) >= 0.0001,
    staleStoneLots: staleStoneStock.map((s) => ({
      stoneType: s.stoneType,
      livePricePerStone: s.livePricePerStone,
      qtyPerMotif: s.qtyPerMotif,
    })),
  };
};
