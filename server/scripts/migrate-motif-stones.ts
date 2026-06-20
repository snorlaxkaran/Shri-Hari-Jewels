/**
 * Best-effort migration: convert Motif.stone1/stone2/stone3 (stone type names)
 * into MotifStone rows linked to BulkStoneLot where stoneType matches.
 *
 * Run after BulkStoneLot seed data exists:
 *   npx tsx scripts/migrate-motif-stones.ts
 */
import { prisma } from "../src/lib/db.js";
import { MOTIF_STONE_TYPES } from "../src/lib/motifs/service.js";
import { recalculateMotifPriceById } from "../src/lib/motifs/service.js";

const main = async () => {
  const motifs = await prisma.motif.findMany({
    where: {
      OR: [
        { stone1: { not: null } },
        { stone2: { not: null } },
        { stone3: { not: null } },
      ],
    },
    include: { stones: true },
  });

  let converted = 0;
  let skipped = 0;

  for (const motif of motifs) {
    if (motif.stones.length > 0) continue;

    const legacyStones = [motif.stone1, motif.stone2, motif.stone3].filter(
      Boolean,
    ) as string[];

    if (legacyStones.length === 0) continue;

    let createdAny = false;

    for (let i = 0; i < legacyStones.length; i++) {
      const stoneType = legacyStones[i];
      if (!MOTIF_STONE_TYPES.includes(stoneType as (typeof MOTIF_STONE_TYPES)[number])) {
        console.warn(
          `Motif "${motif.name}": unknown stone type "${stoneType}", skipped.`,
        );
        skipped += 1;
        continue;
      }

      const lot = await prisma.bulkStoneLot.findFirst({
        where: { branchId: motif.branchId, stoneType },
        orderBy: { createdAt: "asc" },
      });

      if (!lot) {
        console.warn(
          `Motif "${motif.name}": no BulkStoneLot for stone type "${stoneType}", skipped.`,
        );
        skipped += 1;
        continue;
      }

      await prisma.motifStone.create({
        data: {
          motifId: motif.id,
          bulkStoneLotId: lot.id,
          qtyPerMotif: 1,
          sortOrder: i,
        },
      });
      createdAny = true;
    }

    if (createdAny) {
      await recalculateMotifPriceById(motif.id);
      converted += 1;
      console.log(`Converted motif "${motif.name}" (${motif.id})`);
    }
  }

  console.log(`Done. Converted ${converted} motifs, skipped ${skipped} stone slots.`);
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
