import { beforeAll, afterAll, describe, expect, it } from "vitest";
import {
  InventoryUnitStatus,
  SalePaymentStatus,
} from "@prisma/client";
import { prisma } from "../../lib/db.js";
import { recordSale } from "../../lib/sales/service.js";
import { computeListPriceBreakdownForProduct } from "../../lib/inventory/unit-pricing.js";
import { getCurrentMarketRates } from "../../lib/market-rates/service.js";
import { moneyToNumber, subtractMoney } from "../../lib/money.js";
import { assertSaleLineArithmetic } from "../../lib/pricing/arithmetic.js";
import {
  createIntegrationContext,
  createRetailCustomer,
  createSellableInventoryUnit,
  destroyIntegrationContext,
  type IntegrationContext,
} from "./fixtures.js";
import { ensureIntegrationSchema, integrationTestsReady, isIntegrationDbAvailable } from "./setup.js";

describe.skipIf(!isIntegrationDbAvailable())(
  "integration: retail sale",
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

    it("records a cash sale with paisa-exact list, discount, deal, invoice, and stock", async (testCtx) => {
      if (!ready) testCtx.skip();
      const itemCode = `INT-SALE-${ctx.suffix}`;
      const { product, unit } = await createSellableInventoryUnit(ctx, {
        branchId: ctx.storeBranchId,
        itemCode,
        metal: "Silver",
        purity: "925",
        weightGrams: 12.5,
      });

      const customer = await createRetailCustomer(ctx);
      const marketRates = await getCurrentMarketRates(ctx.organizationId);
      const { listPrice } = computeListPriceBreakdownForProduct(product, marketRates);
      const discount = 250;
      const dealPrice = moneyToNumber(subtractMoney(listPrice, discount));

      assertSaleLineArithmetic({ listPrice, discount, dealPrice });

      const result = await recordSale(
        {
          itemCode,
          customerId: customer.id,
          dealPrice,
          discount,
          paymentMode: "Cash",
        },
        ctx.organizationId,
        ctx.storeBranchId,
        ctx.actor,
      );

      expect(result.sale.paymentStatus).toBe("Completed");
      expect(moneyToNumber(result.sale.listPrice)).toBe(listPrice);
      expect(moneyToNumber(result.sale.discount)).toBe(discount);
      expect(moneyToNumber(result.sale.dealPrice)).toBe(dealPrice);
      expect(result.invoice).toBeDefined();

      const invoice = await prisma.invoice.findFirst({
        where: { items: { some: { saleId: result.sale.id } } },
      });
      expect(invoice).toBeTruthy();
      expect(moneyToNumber(invoice!.taxableValue)).toBe(dealPrice);
      expect(moneyToNumber(invoice!.total)).toBe(
        Math.round(
          dealPrice +
            moneyToNumber(invoice!.cgst) +
            moneyToNumber(invoice!.sgst) +
            moneyToNumber(invoice!.igst),
        ),
      );

      const updatedUnit = await prisma.inventoryUnit.findUnique({
        where: { id: unit.id },
      });
      expect(updatedUnit?.status).toBe(InventoryUnitStatus.Sold);

      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(updatedProduct?.stock).toBe(0);

      const saleRow = await prisma.sale.findUnique({
        where: { id: result.sale.id },
      });
      expect(saleRow?.paymentStatus).toBe(SalePaymentStatus.Completed);
    });
  },
);
