import { beforeAll, afterAll, describe, expect, it } from "vitest";
import {
  InventoryUnitStatus,
  SalePaymentStatus,
  StockTransferStatus,
} from "@prisma/client";
import { prisma } from "../../lib/db.js";
import { createStockTransfer } from "../../lib/inventory/service.js";
import { computeLiveListPriceForProduct } from "../../lib/inventory/unit-pricing.js";
import { getCurrentMarketRates } from "../../lib/market-rates/service.js";
import { moneyToNumber, sumMoney } from "../../lib/money.js";
import {
  createIntegrationContext,
  createSellableInventoryUnit,
  createWholesaleCustomer,
  destroyIntegrationContext,
  type IntegrationContext,
} from "./fixtures.js";
import { integrationTestsReady, isIntegrationDbAvailable } from "./setup.js";

describe.skipIf(!isIntegrationDbAvailable())(
  "integration: wholesale GST transfer",
  () => {
    let ctx: IntegrationContext;
    let ready = false;

    beforeAll(async () => {
      ready = integrationTestsReady();
      if (!ready) return;
      ctx = await createIntegrationContext();
    });

    afterAll(async () => {
      if (ctx) await destroyIntegrationContext(ctx);
    });

    it("marks units sold, creates matching sales, and totals transfer value exactly", async (testCtx) => {
      if (!ready) testCtx.skip();

      const itemCodeA = `INT-WHL-A-${ctx.suffix}`;
      const itemCodeB = `INT-WHL-B-${ctx.suffix}`;

      const unitA = await createSellableInventoryUnit(ctx, {
        branchId: ctx.headOfficeBranchId,
        itemCode: itemCodeA,
        metal: "Gold",
        purity: "22K",
        weightGrams: 1.5,
        huid: "ABC123",
      });
      const unitB = await createSellableInventoryUnit(ctx, {
        branchId: ctx.headOfficeBranchId,
        itemCode: itemCodeB,
        metal: "Gold",
        purity: "22K",
        weightGrams: 1.8,
        huid: "DEF456",
      });

      const { customer, customerBranch } = await createWholesaleCustomer(ctx);
      const marketRates = await getCurrentMarketRates(ctx.organizationId);

      const expectedLineA = computeLiveListPriceForProduct(
        unitA.product,
        marketRates,
      );
      const expectedLineB = computeLiveListPriceForProduct(
        unitB.product,
        marketRates,
      );
      const expectedTotal = moneyToNumber(
        sumMoney([expectedLineA, expectedLineB]),
      );

      const { transfer } = await createStockTransfer(
        {
          documentType: "Wholesale GST Invoice",
          transferDate: new Date().toISOString(),
          customerId: customer.id,
          customerBranchId: customerBranch.id,
          itemCodes: [itemCodeA, itemCodeB],
        },
        ctx.actor,
        ctx.organizationId,
        ctx.headOfficeBranchId,
      );

      expect(transfer.status).toBe(StockTransferStatus.Accepted);
      expect(transfer.totalValue).toBe(expectedTotal);
      expect(transfer.items).toHaveLength(2);

      for (const item of transfer.items) {
        const expected =
          item.itemCode === itemCodeA ? expectedLineA : expectedLineB;
        expect(item.price).toBe(expected);
      }

      const units = await prisma.inventoryUnit.findMany({
        where: { itemCode: { in: [itemCodeA, itemCodeB] } },
      });
      expect(units.every((u) => u.status === InventoryUnitStatus.Sold)).toBe(
        true,
      );

      const sales = await prisma.sale.findMany({
        where: { stockTransferId: transfer.id },
        orderBy: { itemCode: "asc" },
      });
      expect(sales).toHaveLength(2);

      for (const sale of sales) {
        expect(sale.paymentStatus).toBe(SalePaymentStatus.Completed);
        expect(moneyToNumber(sale.discount)).toBe(0);
        expect(moneyToNumber(sale.dealPrice)).toBe(moneyToNumber(sale.listPrice));
        expect(sale.saleSource).toBe("WholesaleTransfer");
      }

      const salesTotal = moneyToNumber(sumMoney(sales.map((s) => s.dealPrice)));
      expect(salesTotal).toBe(expectedTotal);

      const products = await prisma.product.findMany({
        where: { id: { in: [unitA.product.id, unitB.product.id] } },
      });
      expect(products.every((p) => p.stock === 0)).toBe(true);
    });
  },
);
