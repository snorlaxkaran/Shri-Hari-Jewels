/**
 * One-time helper to verify money columns after DECIMAL migration.
 * Run: npx tsx scripts/migrate-money-to-decimal.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/db.js";
import { moneyToNumber } from "../src/lib/money.js";

const main = async () => {
  const [product, sale] = await Promise.all([
    prisma.product.findFirst({ select: { price: true, makingCharges: true } }),
    prisma.sale.findFirst({
      select: { listPrice: true, discount: true, dealPrice: true },
    }),
  ]);

  if (product) {
    console.log("Sample product price:", moneyToNumber(product.price));
    console.log("Sample making charges:", moneyToNumber(product.makingCharges));
  }

  if (sale) {
    console.log("Sample sale deal price:", moneyToNumber(sale.dealPrice));
  }

  console.log("Money column read check completed.");
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
