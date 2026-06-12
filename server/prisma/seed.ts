import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password.js";
import { CATEGORY_COLORS } from "../src/lib/inventory/categories.js";
import { formatUnitCode } from "../src/lib/inventory/sku.js";
import { getStockStatus } from "../src/lib/inventory/status.js";

const prisma = new PrismaClient();

const seedUsers = [
  {
    email: "admin@shreehari.com",
    name: "Store Admin",
    password: "admin123",
    role: "Admin",
  },
  {
    email: "production@shreehari.com",
    name: "Production Manager",
    password: "prod123",
    role: "ProductionManager",
  },
  {
    email: "sales@shreehari.com",
    name: "Sales Manager",
    password: "sales123",
    role: "SalesManager",
  },
  {
    email: "karigar@shreehari.com",
    name: "Rajesh Karigar",
    password: "karigar123",
    role: "Karigar",
  },
  {
    email: "accountant@shreehari.com",
    name: "Finance Accountant",
    password: "acct123",
    role: "Accountant",
  },
] as const;

const seedProducts = [
  {
    sku: "NK-26-0001",
    name: "Temple Lakshmi Necklace",
    category: "Necklaces",
    metal: "Gold",
    purity: "22K",
    weightGrams: 45.2,
    makingCharges: 8500,
    stoneCarat: 0.5,
    stock: 3,
    price: 285000,
    imageColor: CATEGORY_COLORS.Necklaces,
  },
  {
    sku: "RG-26-0001",
    name: "Solitaire Diamond Ring",
    category: "Rings",
    metal: "Gold",
    purity: "18K",
    weightGrams: 4.8,
    makingCharges: 12000,
    stoneCarat: 1.2,
    stock: 8,
    price: 195000,
    imageColor: CATEGORY_COLORS.Rings,
  },
  {
    sku: "BG-26-0001",
    name: "Kundan Bridal Bangle Set",
    category: "Bangles",
    metal: "Gold",
    purity: "22K",
    weightGrams: 62.0,
    makingCharges: 15000,
    stock: 2,
    price: 420000,
    imageColor: CATEGORY_COLORS.Bangles,
  },
  {
    sku: "ER-26-0001",
    name: "Pearl Drop Earrings",
    category: "Earrings",
    metal: "Silver",
    purity: "925",
    weightGrams: 12.5,
    makingCharges: 2500,
    stock: 15,
    price: 18500,
    imageColor: CATEGORY_COLORS.Earrings,
  },
  {
    sku: "RG-26-0002",
    name: "Antique Ruby Ring",
    category: "Rings",
    metal: "Rose Gold",
    purity: "18K",
    weightGrams: 6.2,
    makingCharges: 9500,
    stoneCarat: 0.8,
    stock: 0,
    price: 142000,
    imageColor: "#e8b4b8",
  },
  {
    sku: "NK-26-0002",
    name: "Mangalsutra Classic",
    category: "Necklaces",
    metal: "Gold",
    purity: "22K",
    weightGrams: 8.5,
    makingCharges: 3200,
    stock: 22,
    price: 68000,
    imageColor: CATEGORY_COLORS.Necklaces,
  },
  {
    sku: "BG-26-0002",
    name: "Plain Gold Bangle Pair",
    category: "Bangles",
    metal: "Gold",
    purity: "22K",
    weightGrams: 24.0,
    makingCharges: 4800,
    stock: 11,
    price: 156000,
    imageColor: CATEGORY_COLORS.Bangles,
  },
  {
    sku: "ER-26-0002",
    name: "Jhumka Gold Earrings",
    category: "Earrings",
    metal: "Gold",
    purity: "22K",
    weightGrams: 9.8,
    makingCharges: 3800,
    stock: 6,
    price: 72000,
    imageColor: CATEGORY_COLORS.Earrings,
  },
];

async function seedAuthUsers() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("Users already seeded, skipping users.");
    return;
  }

  for (const user of seedUsers) {
    await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        password: await hashPassword(user.password),
        role: user.role,
      },
    });
  }

  console.log(`Seeded ${seedUsers.length} users.`);
}

const seedMetalLots = [
  {
    lotNumber: "GLD-26-0001",
    metalType: "Gold",
    purity: "22K",
    weightGrams: 500,
    purchaseRate: 6200,
    currentRate: 6850,
    vendor: "Rajesh Bullion Traders",
    location: "Main Vault",
  },
  {
    lotNumber: "GLD-26-0002",
    metalType: "Gold",
    purity: "18K",
    weightGrams: 250,
    purchaseRate: 5100,
    currentRate: 5650,
    vendor: "Rajesh Bullion Traders",
    location: "Workshop",
  },
  {
    lotNumber: "SLV-26-0001",
    metalType: "Silver",
    purity: "925",
    weightGrams: 1200,
    purchaseRate: 78,
    currentRate: 92,
    vendor: "Mumbai Silver House",
    location: "Main Vault",
  },
  {
    lotNumber: "PLT-26-0001",
    metalType: "Platinum",
    purity: "18K",
    weightGrams: 85,
    purchaseRate: 3200,
    currentRate: 3450,
    vendor: "Platinum Imports Pvt Ltd",
    location: "Main Vault",
  },
] as const;

const seedStoneLots = [
  {
    certificateNumber: "DMD-26-0001",
    stoneType: "Diamond",
    carat: 1.25,
    color: "F",
    clarity: "VVS1",
    cut: "Excellent",
    vendor: "GIA Certified Diamonds",
    purchaseRate: 185000,
    currentRate: 210000,
    location: "Main Vault",
  },
  {
    certificateNumber: "DMD-26-0002",
    stoneType: "Diamond",
    carat: 0.75,
    color: "G",
    clarity: "VS2",
    cut: "Very Good",
    vendor: "GIA Certified Diamonds",
    purchaseRate: 95000,
    currentRate: 108000,
    location: "Workshop",
  },
  {
    certificateNumber: "PRC-26-0001",
    stoneType: "Precious",
    carat: 3.2,
    color: "Pigeon Blood Red",
    clarity: "Eye Clean",
    cut: "Oval",
    vendor: "Jaipur Gem House",
    purchaseRate: 45000,
    currentRate: 52000,
    location: "Main Vault",
  },
  {
    certificateNumber: "SMP-26-0001",
    stoneType: "SemiPrecious",
    carat: 5.5,
    color: "Blue",
    clarity: "AA",
    cut: "Cushion",
    vendor: "Jaipur Gem House",
    purchaseRate: 8000,
    currentRate: 9500,
    location: "Main Vault",
  },
] as const;

async function seedRawInventory() {
  const metalCount = await prisma.metalLot.count();
  if (metalCount === 0) {
    for (const lot of seedMetalLots) {
      await prisma.metalLot.create({ data: { ...lot } });
    }
    console.log(`Seeded ${seedMetalLots.length} metal lots.`);
  } else {
    console.log("Metal lots already seeded, skipping.");
  }

  const stoneCount = await prisma.stoneLot.count();
  if (stoneCount === 0) {
    for (const lot of seedStoneLots) {
      await prisma.stoneLot.create({ data: { ...lot } });
    }
    console.log(`Seeded ${seedStoneLots.length} stone lots.`);
  } else {
    console.log("Stone lots already seeded, skipping.");
  }
}

async function main() {
  await seedAuthUsers();
  await seedRawInventory();

  const count = await prisma.product.count();
  if (count > 0) {
    console.log("Products already seeded, skipping products.");
    return;
  }

  for (const item of seedProducts) {
    await prisma.product.create({
      data: {
        ...item,
        status: getStockStatus(item.stock),
        units: {
          create: Array.from({ length: item.stock }, (_, i) => ({
            itemCode: formatUnitCode(item.sku, i + 1),
            status: "Available",
          })),
        },
      },
    });
  }

  console.log(`Seeded ${seedProducts.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
