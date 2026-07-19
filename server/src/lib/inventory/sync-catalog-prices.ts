import { prisma } from "../db.js";
import { getCurrentMarketRates } from "../market-rates/service.js";
import { moneyToNumber, toMoney } from "../money.js";
import { computeLiveListPriceForProduct } from "./unit-pricing.js";

export type SyncCatalogPricesReport = {
  updated: number;
  unchanged: number;
  changes: Array<{ sku: string; from: number; to: number }>;
};

/** Align Product.price with today's live market-based list price. */
export const syncProductCatalogPricesToLive = async (
  organizationId?: string,
): Promise<SyncCatalogPricesReport> => {
  const products = await prisma.product.findMany({
    where: organizationId ? { organizationId } : {},
    select: {
      id: true,
      sku: true,
      organizationId: true,
      metal: true,
      purity: true,
      weightGrams: true,
      price: true,
    },
    orderBy: { sku: "asc" },
  });

  const orgIds = [
    ...new Set(products.map((product) => product.organizationId)),
  ];

  const ratesByOrg = new Map<
    string,
    Awaited<ReturnType<typeof getCurrentMarketRates>>
  >();
  for (const orgId of orgIds) {
    ratesByOrg.set(orgId, await getCurrentMarketRates(orgId));
  }

  let updated = 0;
  let unchanged = 0;
  const changes: SyncCatalogPricesReport["changes"] = [];

  for (const product of products) {
    const marketRates = ratesByOrg.get(product.organizationId)!;
    const livePrice = computeLiveListPriceForProduct(product, marketRates);
    const dbPrice = moneyToNumber(product.price);

    if (Math.abs(dbPrice - livePrice) <= 0.01) {
      unchanged += 1;
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { price: toMoney(livePrice) },
    });

    changes.push({ sku: product.sku, from: dbPrice, to: livePrice });
    updated += 1;
  }

  return { updated, unchanged, changes };
};
