import { prisma } from "../src/lib/db.js";
import { hashPassword } from "../src/lib/auth/password.js";

async function main() {
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

  const branch = await prisma.branch.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      name: "Main Branch",
      address: "123 Jewelry Street, Mumbai",
      phone: "+91-9876543210",
      email: "main@shreehari.com",
      manager: "Admin",
      active: true,
    },
  });

  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: adminUser.id, branchId: branch.id } },
    update: {},
    create: {
      userId: adminUser.id,
      branchId: branch.id,
    },
  });

  await prisma.user.update({
    where: { id: adminUser.id },
    data: { defaultBranchId: branch.id },
  });

  await prisma.shopSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      businessName: "Shree Hari Jewels",
      address: "123 Jewelry Street, Mumbai",
      phone: "+91-9876543210",
      upiVpa: "shreehari@upi",
    },
  });

  const customer = await prisma.customer.upsert({
    where: { mobile: "9876543210" },
    update: {},
    create: {
      name: "Sample Customer",
      mobile: "9876543210",
      email: "customer@example.com",
      address: "456 Customer Lane",
      city: "Mumbai",
      ringSize: "12",
      preferences: "Gold rings, traditional designs",
    },
  });

  const existingProduct = await prisma.product.findUnique({
    where: { sku: "RG-26-0001" },
  });

  if (!existingProduct) {
    await prisma.product.create({
      data: {
        branchId: branch.id,
        sku: "RG-26-0001",
        name: "Classic Gold Ring",
        category: "Rings",
        metal: "Gold",
        purity: "22K",
        weightGrams: 4.5,
        makingCharges: 2500,
        stoneCarat: 0,
        price: 45000,
        stock: 2,
        status: "In Stock",
        imageColor: "#d4af37",
        units: {
          create: [
            {
              branchId: branch.id,
              itemCode: "RG-26-0001-001",
              status: "Available",
            },
            {
              branchId: branch.id,
              itemCode: "RG-26-0001-002",
              status: "Available",
            },
          ],
        },
      },
    });
  }

  const existingGoldLot = await prisma.metalLot.findFirst({
    where: { lotNumber: "GL-26-0001" },
  });

  if (!existingGoldLot) {
    await prisma.metalLot.create({
      data: {
        branchId: branch.id,
        lotNumber: "GL-26-0001",
        metalType: "Gold",
        purity: "24K",
        weightGrams: 500,
        purchaseRate: 6200,
        currentRate: 6500,
        vendor: "Sample Bullion Dealer",
        location: "Vault A",
      },
    });
  }

  const existingSilverLot = await prisma.metalLot.findFirst({
    where: { lotNumber: "SL-26-0001" },
  });

  if (!existingSilverLot) {
    await prisma.metalLot.create({
      data: {
        branchId: branch.id,
        lotNumber: "SL-26-0001",
        metalType: "Silver",
        purity: "999",
        weightGrams: 2000,
        purchaseRate: 75,
        currentRate: 82,
        vendor: "Sample Silver Supplier",
        location: "Vault B",
      },
    });
  }

  const existingDiamondLot = await prisma.stoneLot.findFirst({
    where: { certificateNumber: "DIA-SEED-001" },
  });

  if (!existingDiamondLot) {
    await prisma.stoneLot.create({
      data: {
        branchId: branch.id,
        certificateNumber: "DIA-SEED-001",
        stoneType: "Diamond",
        carat: 2.5,
        color: "G",
        clarity: "VS1",
        cut: "Excellent",
        purchaseRate: 85000,
        currentRate: 92000,
        vendor: "Sample Diamond Dealer",
        location: "Safe 1",
        status: "In Stock",
      },
    });
  }

  console.log("✅ Seeded database successfully!");
  console.log(`\nDefault Admin Account:`);
  console.log(`📧 Email: ${adminUser.email}`);
  console.log(`🔑 Password: admin123`);
  console.log(`\n🏪 Main Branch: ${branch.name} (ID: ${branch.id})`);
  console.log(`\n👤 Sample Customer: ${customer.name} (${customer.mobile})`);
  console.log(`💍 Sample Product: RG-26-0001 — item codes RG-26-0001-001, RG-26-0001-002`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
