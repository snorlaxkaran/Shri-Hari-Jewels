import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import { getCurrentMarketRates } from "../market-rates/service.js";

const roundRate = (value: number) => Math.round(value * 100) / 100;

const karatFromPurity = (purity: string): number | null => {
  if (purity === "925") return null;
  const match = /^(\d+)K$/.exec(purity);
  return match ? Number.parseInt(match[1]!, 10) : null;
};

export const resolveMarketRateForMetalPurity = async (
  metal: string,
  purity: string,
): Promise<number> => {
  const rates = await getCurrentMarketRates();

  if (metal === "Gold") {
    if (rates.gold22k == null) {
      throw new Error("22K gold market rate is not set. Update market rates first.");
    }
    const karat = karatFromPurity(purity);
    if (karat == null) {
      throw new Error(`Invalid gold purity "${purity}".`);
    }
    return roundRate(rates.gold22k * (karat / 22));
  }

  if (metal === "Silver" && purity === "925") {
    if (rates.silver925 == null) {
      throw new Error("925 silver market rate is not set. Update market rates first.");
    }
    return rates.silver925;
  }

  const lots = await prisma.metalLot.findMany({
    where: { metalType: metal, purity },
    select: { currentRate: true },
  });
  if (lots.length === 0) return 0;

  const total = lots.reduce(
    (sum, lot) => sum + moneyToNumber(String(lot.currentRate)),
    0,
  );
  return roundRate(total / lots.length);
};
