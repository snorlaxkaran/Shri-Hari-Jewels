import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import { getLatestMotifPriceChange } from "./audit.js";
import {
  calculateMotifPrice,
  getMotif,
} from "../motifs/service.js";
import type {
  DesignElementPriceDrift,
  MotifMetal,
  MotifPriceDrift,
  Purity,
} from "../../types.js";

export const getDesignPriceDrift = async (
  designId: string,
): Promise<DesignElementPriceDrift[]> => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    include: { elements: true },
  });
  if (!design) return [];

  const drifts: DesignElementPriceDrift[] = [];

  for (const element of design.elements) {
    if (!element.motifId || element.unitValue == null) continue;

    const motif = await getMotif(element.motifId);
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
): Promise<MotifPriceDrift | null> => {
  const motif = await prisma.motif.findUnique({
    where: { id: motifId },
    include: {
      stones: {
        include: { bulkStoneLot: true },
      },
    },
  });
  if (!motif) return null;

  const stones = motif.stones.map((s) => ({
    bulkStoneLotId: s.bulkStoneLotId,
    qtyPerMotif: s.qtyPerMotif,
    sortOrder: s.sortOrder,
  }));

  const calculatedPrice = await calculateMotifPrice({
    weightGrams: motif.weightGrams,
    metal: motif.metal as MotifMetal,
    purity: motif.purity as Purity,
    stones,
  });
  const storedPrice =
    motif.price != null ? moneyToNumber(String(motif.price)) : 0;

  const staleStoneLots = motif.stones
    .map((s) => ({
      bulkStoneLotId: s.bulkStoneLotId,
      sizeLabel: s.bulkStoneLot.sizeLabel,
      livePricePerStone: moneyToNumber(String(s.bulkStoneLot.pricePerStone)),
      qtyPerMotif: s.qtyPerMotif,
    }))
    .filter(() => Math.abs(storedPrice - calculatedPrice) >= 0.0001);

  if (
    Math.abs(storedPrice - calculatedPrice) < 0.0001 &&
    staleStoneLots.length === 0
  ) {
    return {
      motifId,
      motifName: motif.name,
      storedPrice,
      calculatedPrice,
      isStale: false,
      staleStoneLots: [],
    };
  }

  return {
    motifId,
    motifName: motif.name,
    storedPrice,
    calculatedPrice,
    isStale: true,
    staleStoneLots,
  };
};

export const listMotifPriceDrifts = async (): Promise<MotifPriceDrift[]> => {
  const motifs = await prisma.motif.findMany({
    select: { id: true },
  });

  const results: MotifPriceDrift[] = [];
  for (const { id } of motifs) {
    const drift = await getMotifPriceDrift(id);
    if (drift?.isStale) results.push(drift);
  }
  return results;
};
