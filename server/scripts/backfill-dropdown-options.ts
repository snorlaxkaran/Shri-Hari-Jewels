/**
 * Seed DropdownOption rows for every organization from built-in defaults.
 *
 * Run:  npm run db:backfill-dropdown-options
 * Dry:  npm run db:backfill-dropdown-options -- --dry-run
 */
import "dotenv/config";
import { prisma } from "../src/lib/db.js";
import { DROPDOWN_OPTION_DEFAULTS } from "../src/lib/dropdown-options/defaults.js";

const dryRun = process.argv.includes("--dry-run");

const main = async () => {
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
  });

  if (organizations.length === 0) {
    console.log("No organizations found.");
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const org of organizations) {
    for (const [fieldKey, values] of Object.entries(DROPDOWN_OPTION_DEFAULTS)) {
      for (let index = 0; index < values.length; index += 1) {
        const value = values[index]!;
        const existing = await prisma.dropdownOption.findFirst({
          where: {
            organizationId: org.id,
            fieldKey,
            value: { equals: value, mode: "insensitive" },
          },
        });

        if (existing) {
          skipped += 1;
          continue;
        }

        if (dryRun) {
          console.log(`[dry-run] would create ${org.name}: ${fieldKey} = ${value}`);
          created += 1;
          continue;
        }

        await prisma.dropdownOption.create({
          data: {
            organizationId: org.id,
            fieldKey,
            value,
            sortOrder: index,
          },
        });
        created += 1;
      }
    }
  }

  console.log(
    dryRun
      ? `Dry run complete — would create ${created} option(s), ${skipped} already present.`
      : `Backfill complete — created ${created} option(s), skipped ${skipped} existing.`,
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
