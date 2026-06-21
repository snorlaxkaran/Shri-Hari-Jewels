import { recalculateAllMotifPrices } from "../src/lib/motifs/service.js";
import { prisma } from "../src/lib/db.js";

async function main() {
  const count = await recalculateAllMotifPrices(
    undefined,
    "Manual sync from market rates",
  );
  console.log(`Updated ${count} motif price(s) from current market rates.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
