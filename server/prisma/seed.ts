import { prisma } from "../src/lib/db.js";
import { hashPassword } from "../src/lib/auth/password.js";

async function main() {
  // Create default admin user
  const hashedPassword = await hashPassword("admin123");

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@shreehari.com" },
    update: {},
    create: {
      email: "admin@shreehari.com",
      name: "Admin",
      password: hashedPassword,
      role: "Admin",
      active: true,
    },
  });

  // Create default branch
  const branch = await prisma.branch.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      name: "Main Branch",
      address: "123 Jewelry Street",
      phone: "+91-XXXXXXXXXX",
      email: "main@shreehari.com",
      manager: "Admin",
      active: true,
    },
  });

  // Assign admin to main branch
  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: adminUser.id, branchId: branch.id } },
    update: {},
    create: {
      userId: adminUser.id,
      branchId: branch.id,
    },
  });

  console.log("✅ Seeded database successfully!");
  console.log(`\nDefault Admin Account:`);
  console.log(`📧 Email: ${adminUser.email}`);
  console.log(`🔑 Password: admin123`);
  console.log(`\n🏪 Main Branch: ${branch.name} (ID: ${branch.id})`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
