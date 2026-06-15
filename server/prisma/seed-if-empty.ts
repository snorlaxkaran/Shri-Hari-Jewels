import { prisma } from "../src/lib/db.js";
import { seedDatabase } from "./seed.js";

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(`Database already has ${userCount} user(s). Skipping seed.`);
    return;
  }

  console.log("Empty database detected — running initial seed...");
  await seedDatabase();
  console.log("Initial seed complete.");
}

main()
  .catch((error) => {
    console.error("Seed-if-empty failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
