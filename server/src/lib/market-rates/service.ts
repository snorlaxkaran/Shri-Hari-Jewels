import { prisma } from "../db.js";
import { getShopSettings } from "../settings/service.js";
import { moneyToNumber } from "../money.js";
import type {
  MarketRateHistoryEntry,
  MarketRatesCurrent,
  OverrideMarketRatesInput,
} from "../../types.js";

const TROY_OZ_GRAMS = 31.1035;

export class MarketRateError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "MarketRateError";
  }
}

export const fetchLiveRates = async (): Promise<{
  gold22k: number;
  silver925: number;
  source: string;
  fetchedAt: Date;
}> => {
  const apiKey = process.env.METALS_API_KEY?.trim();
  if (!apiKey) {
    throw new MarketRateError(
      "METALS_API_KEY is not configured. Set rates manually.",
      503,
    );
  }

  const response = await fetch(
    `https://metals-api.com/api/latest?access_key=${apiKey}&base=INR&symbols=XAU,XAG`,
  );

  if (!response.ok) {
    throw new MarketRateError("Live rate fetch failed.", 502);
  }

  const data = (await response.json()) as {
    success?: boolean;
    rates?: { XAU?: number; XAG?: number };
    error?: { info?: string };
  };

  if (!data.success || !data.rates?.XAU || !data.rates?.XAG) {
    throw new MarketRateError(
      data.error?.info ?? "Live rate fetch returned invalid data.",
      502,
    );
  }

  const goldPerGram = 1 / data.rates.XAU / TROY_OZ_GRAMS;
  const gold22kPerGram = goldPerGram * (22 / 24);
  const silverPerGram = 1 / data.rates.XAG / TROY_OZ_GRAMS;
  const silver925PerGram = silverPerGram * 0.925;

  return {
    gold22k: Math.round(gold22kPerGram * 100) / 100,
    silver925: Math.round(silver925PerGram * 100) / 100,
    source: "API",
    fetchedAt: new Date(),
  };
};

export const getLatestRate = async (metalType: string, purity: string) =>
  prisma.metalMarketRate.findFirst({
    where: { metalType, purity },
    orderBy: { fetchedAt: "desc" },
  });

export const persistRates = async (input: {
  gold22k: number;
  silver925: number;
  source: string;
  fetchedAt: Date;
}) => {
  await prisma.metalMarketRate.createMany({
    data: [
      {
        metalType: "Gold",
        purity: "22K",
        ratePerGram: input.gold22k,
        source: input.source,
        fetchedAt: input.fetchedAt,
      },
      {
        metalType: "Silver",
        purity: "925",
        ratePerGram: input.silver925,
        source: input.source,
        fetchedAt: input.fetchedAt,
      },
    ],
  });
};

export const getLatestRates = async () => {
  const [gold, silver] = await Promise.all([
    getLatestRate("Gold", "22K"),
    getLatestRate("Silver", "925"),
  ]);
  return { gold, silver };
};

const DEFAULT_MAKING_CHARGES = {
  goldMakingChargesPct: 17,
  silverMakingChargesPct: 17,
};

export const getCurrentMarketRates = async (
  organizationId?: string,
): Promise<MarketRatesCurrent> => {
  const [settings, { gold, silver }] = await Promise.all([
    organizationId
      ? getShopSettings(organizationId)
      : Promise.resolve(DEFAULT_MAKING_CHARGES),
    getLatestRates(),
  ]);

  const goldRate = gold ? moneyToNumber(gold.ratePerGram) : null;
  const silverRate = silver ? moneyToNumber(silver.ratePerGram) : null;
  const fetchedAt = gold?.fetchedAt ?? silver?.fetchedAt ?? null;
  const source = gold?.source ?? silver?.source ?? null;

  return {
    gold22k: goldRate,
    silver925: silverRate,
    goldMakingChargesPct: settings.goldMakingChargesPct,
    silverMakingChargesPct: settings.silverMakingChargesPct,
    source,
    fetchedAt: fetchedAt?.toISOString() ?? null,
    isStale: fetchedAt
      ? Date.now() - fetchedAt.getTime() > 24 * 60 * 60 * 1000
      : true,
  };
};

export const refreshMarketRates = async (): Promise<MarketRatesCurrent> => {
  const rates = await fetchLiveRates();
  await persistRates(rates);
  const { recalculateAllMotifPrices } = await import("../motifs/service.js");
  await recalculateAllMotifPrices(undefined, "Market rates refreshed");
  return getCurrentMarketRates();
};

export const overrideMarketRates = async (
  organizationId: string,
  input: OverrideMarketRatesInput,
): Promise<MarketRatesCurrent> => {
  if (input.gold22k <= 0 || input.silver925 <= 0) {
    throw new MarketRateError("Rates must be greater than zero.");
  }
  if (
    input.goldMakingChargesPct <= 0 ||
    input.silverMakingChargesPct <= 0
  ) {
    throw new MarketRateError("Making charge percentages must be greater than zero.");
  }

  const fetchedAt = new Date();

  await prisma.$transaction([
    prisma.metalMarketRate.createMany({
      data: [
        {
          metalType: "Gold",
          purity: "22K",
          ratePerGram: input.gold22k,
          source: "Manual",
          fetchedAt,
        },
        {
          metalType: "Silver",
          purity: "925",
          ratePerGram: input.silver925,
          source: "Manual",
          fetchedAt,
        },
      ],
    }),
    prisma.shopSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        goldMakingChargesPct: input.goldMakingChargesPct,
        silverMakingChargesPct: input.silverMakingChargesPct,
        makingChargesOverrideNote: input.note?.trim() || null,
      },
      update: {
        goldMakingChargesPct: input.goldMakingChargesPct,
        silverMakingChargesPct: input.silverMakingChargesPct,
        makingChargesOverrideNote: input.note?.trim() || null,
      },
    }),
  ]);

  const { recalculateAllMotifPrices } = await import("../motifs/service.js");
  await recalculateAllMotifPrices(organizationId, "Market rates updated");

  return getCurrentMarketRates(organizationId);
};

export const getMarketRateHistory = async (): Promise<
  MarketRateHistoryEntry[]
> => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.metalMarketRate.findMany({
    where: { fetchedAt: { gte: since } },
    orderBy: { fetchedAt: "desc" },
    take: 500,
  });

  return rows.map((row) => ({
    id: row.id,
    metalType: row.metalType,
    purity: row.purity,
    ratePerGram: moneyToNumber(row.ratePerGram),
    source: row.source,
    fetchedAt: row.fetchedAt.toISOString(),
  }));
};
