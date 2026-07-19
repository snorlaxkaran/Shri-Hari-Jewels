/**
 * Wipes all operational ERP data for Shree Hari Jewels (fresh start).
 * Preserves users, branches, and shop settings.
 *
 * Run: npm run db:reset-shreehari -- --confirm
 */
import "dotenv/config";
import { prisma } from "../src/lib/db.js";
import {
  resolveOrganizationForReset,
  resetOrganizationData,
  SHREE_HARI_ORG,
} from "../src/lib/organizations/reset-data.js";

const main = async () => {
  const confirm = process.argv.includes("--confirm");
  const slugArg = process.argv.find((arg) => arg.startsWith("--org="))?.slice(6);
  const orgKey = slugArg ?? SHREE_HARI_ORG.slug;

  const organization = await resolveOrganizationForReset(orgKey);
  if (!organization) {
    throw new Error(`Organization not found: ${orgKey}`);
  }

  if (!confirm) {
    console.error(
      `This will DELETE all inventory, sales, customers, designs, production, and raw stock for "${organization.name}".`,
    );
    console.error("Users, branches, and shop settings are kept.");
    console.error("");
    console.error(`Re-run with: npm run db:reset-shreehari -- --confirm`);
    process.exit(1);
  }

  console.log(`Resetting all data for ${organization.name} (${organization.slug})…`);

  const before = {
    products: await prisma.product.count({ where: { organizationId: organization.id } }),
    units: await prisma.inventoryUnit.count({ where: { organizationId: organization.id } }),
    sales: await prisma.sale.count({ where: { branch: { organizationId: organization.id } } }),
    customers: await prisma.customer.count({ where: { organizationId: organization.id } }),
    designs: await prisma.design.count({ where: { organizationId: organization.id } }),
    productionRuns: await prisma.productionRun.count({ where: { organizationId: organization.id } }),
    metalLots: await prisma.metalLot.count({ where: { branch: { organizationId: organization.id } } }),
  };

  console.log("Before:", before);

  const deleted = await resetOrganizationData(organization.id);

  const after = {
    products: await prisma.product.count({ where: { organizationId: organization.id } }),
    units: await prisma.inventoryUnit.count({ where: { organizationId: organization.id } }),
    sales: await prisma.sale.count({ where: { branch: { organizationId: organization.id } } }),
    customers: await prisma.customer.count({ where: { organizationId: organization.id } }),
    designs: await prisma.design.count({ where: { organizationId: organization.id } }),
    productionRuns: await prisma.productionRun.count({ where: { organizationId: organization.id } }),
    metalLots: await prisma.metalLot.count({ where: { branch: { organizationId: organization.id } } }),
  };

  console.log("\nDeleted rows:");
  for (const [key, count] of Object.entries(deleted).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${key}: ${count}`);
  }

  console.log("\nAfter:", after);
  console.log("\nDone. Shree Hari ERP data is now empty.");
};

main()
  .catch((error) => {
    console.error("Reset failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
