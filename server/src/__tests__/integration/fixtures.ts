import {
  DesignApprovalStatus,
  DesignBuilderStage,
  ProductStockStatus,
  InventoryUnitStatus,
} from "@prisma/client";
import { prisma } from "../../lib/db.js";
import { DEFAULT_BRANCH_ID } from "../../lib/branches/constants.js";
import { toMoney } from "../../lib/money.js";
import { uniqueSuffix } from "./setup.js";

export type IntegrationContext = {
  suffix: string;
  organizationId: string;
  headOfficeBranchId: string;
  storeBranchId: string;
  adminUserId: string;
  actor: { id: string; name: string };
};

export const createIntegrationContext = async (): Promise<IntegrationContext> => {
  const suffix = uniqueSuffix();
  const organizationId = `org-int-${suffix}`;

  await prisma.organization.create({
    data: {
      id: organizationId,
      name: `Integration Test Org ${suffix}`,
      slug: `int-${suffix}`,
      active: true,
      shopSettings: {
        create: {
          businessName: "Integration Jewellers",
          state: "Maharashtra",
          goldMakingChargesPct: 12,
          silverMakingChargesPct: 10,
          discountApprovalThresholdPct: 15,
        },
      },
      branches: {
        create: [
          {
            id: `${DEFAULT_BRANCH_ID}-${suffix}`,
            name: "Head Office (Admin)",
            address: "Mumbai, Maharashtra",
            phone: "+910000000001",
            email: `ho-${suffix}@test.local`,
            manager: "Test Admin",
            active: true,
          },
          {
            id: `store-${suffix}`,
            name: "Test Store",
            address: "Pune, Maharashtra",
            phone: "+910000000002",
            email: `store-${suffix}@test.local`,
            manager: "Test Store",
            active: true,
          },
        ],
      },
    },
  });

  const headOfficeBranchId = `${DEFAULT_BRANCH_ID}-${suffix}`;
  const storeBranchId = `store-${suffix}`;

  const admin = await prisma.user.create({
    data: {
      email: `admin-${suffix}@test.local`,
      name: "Integration Admin",
      password: "unused-hash",
      role: "Admin",
      active: true,
      organizationId,
      defaultBranchId: headOfficeBranchId,
    },
  });

  await prisma.metalMarketRate.createMany({
    data: [
      {
        metalType: "Gold",
        purity: "22K",
        ratePerGram: 5850,
        source: "IntegrationTest",
        fetchedAt: new Date(),
      },
      {
        metalType: "Silver",
        purity: "925",
        ratePerGram: 72.5,
        source: "IntegrationTest",
        fetchedAt: new Date(),
      },
    ],
  });

  return {
    suffix,
    organizationId,
    headOfficeBranchId,
    storeBranchId,
    adminUserId: admin.id,
    actor: { id: admin.id, name: admin.name },
  };
};

export const destroyIntegrationContext = async (
  ctx: IntegrationContext,
): Promise<void> => {
  await prisma.organization.delete({ where: { id: ctx.organizationId } }).catch(() => {
    // Org may already be removed by a failed test cleanup.
  });
};

export const createMetalLot = async (
  ctx: IntegrationContext,
  input: {
    weightGrams: number;
    metalType?: string;
    purity?: string;
  },
) => {
  const lotNumber = `INT-G-${ctx.suffix}-${Math.random().toString(36).slice(2, 6)}`;
  return prisma.metalLot.create({
    data: {
      branchId: ctx.headOfficeBranchId,
      lotNumber,
      metalType: input.metalType ?? "Gold",
      purity: input.purity ?? "22K",
      weightGrams: input.weightGrams,
      purchaseRate: toMoney(5800),
      currentRate: toMoney(5850),
      vendor: "Integration Vendor",
    },
  });
};

export const createApprovedDesign = async (
  ctx: IntegrationContext,
  input: { weightGramsPerPc: number; code?: string },
) => {
  const code = input.code ?? `DES-${ctx.suffix}`;
  return prisma.design.create({
    data: {
      organizationId: ctx.organizationId,
      branchId: ctx.headOfficeBranchId,
      code,
      name: "Integration Ring Design",
      metal: "Gold",
      purity: "22K",
      builderStage: DesignBuilderStage.Complete,
      approvalStatus: DesignApprovalStatus.Approved,
      approvedByName: ctx.actor.name,
      approvedAt: new Date(),
      elements: {
        create: [
          {
            name: "Casting shank",
            type: "Casting",
            qtyPerSet: 1,
            weightGramsPerPc: input.weightGramsPerPc,
            sortOrder: 0,
          },
        ],
      },
    },
    include: { elements: true },
  });
};

export const createSellableInventoryUnit = async (
  ctx: IntegrationContext,
  input: {
    branchId: string;
    itemCode: string;
    weightGrams?: number;
    metal?: string;
    purity?: string;
    listPrice?: number;
    huid?: string;
  },
) => {
  const sku = `SKU-INT-${ctx.suffix}-${input.itemCode}`;
  const product = await prisma.product.create({
    data: {
      organizationId: ctx.organizationId,
      branchId: input.branchId,
      sku,
      name: "Integration Test Product",
      category: "Ring",
      metal: input.metal ?? "Silver",
      purity: input.purity ?? "925",
      weightGrams: input.weightGrams ?? 8.5,
      makingCharges: toMoney(500),
      price: toMoney(input.listPrice ?? 12000),
      stock: 1,
      status: ProductStockStatus.InStock,
    },
  });

  const unit = await prisma.inventoryUnit.create({
    data: {
      organizationId: ctx.organizationId,
      branchId: input.branchId,
      itemCode: input.itemCode,
      productId: product.id,
      status: InventoryUnitStatus.Available,
      listPrice: toMoney(input.listPrice ?? 12000),
      huid: input.huid ?? null,
    },
    include: { product: true },
  });

  return { product, unit };
};

export const createRetailCustomer = async (ctx: IntegrationContext) =>
  prisma.customer.create({
    data: {
      organizationId: ctx.organizationId,
      name: "Integration Customer",
      mobile: `9${ctx.suffix.replace(/\D/g, "").padEnd(9, "0").slice(0, 9)}`,
      billingState: "Maharashtra",
    },
  });

export const createWholesaleCustomer = async (ctx: IntegrationContext) => {
  const customer = await prisma.customer.create({
    data: {
      organizationId: ctx.organizationId,
      name: "Wholesale Buyer",
      mobile: `8${ctx.suffix.replace(/\D/g, "").padEnd(9, "8").slice(0, 9)}`,
      gstNumber: "27AABCU9603R1ZM",
      billingState: "Maharashtra",
    },
  });

  const customerBranch = await prisma.customerBranch.create({
    data: {
      customerId: customer.id,
      name: "Wholesale Branch",
      state: "Maharashtra",
      gstNumber: "27AABCU9603R1ZM",
    },
  });

  return { customer, customerBranch };
};
