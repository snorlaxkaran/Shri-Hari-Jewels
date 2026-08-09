import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db.js";
import { createProductionRun } from "../../lib/production-runs/service.js";
import { computeMetalPerSetGramsFromDesign } from "../../lib/production-runs/metal-weight.js";
import { sumMetalLotGrams } from "../../lib/production-runs/metal-lot-matching.js";
import { roundWeightGrams } from "../../lib/pricing/arithmetic.js";
import {
  createApprovedDesign,
  createIntegrationContext,
  createMetalLot,
  destroyIntegrationContext,
  type IntegrationContext,
} from "./fixtures.js";
import { integrationTestsReady, isIntegrationDbAvailable } from "./setup.js";

describe.skipIf(!isIntegrationDbAvailable())(
  "integration: production run metal deduction",
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

    it("deducts perSetGrams × setsOrdered from raw metal on run creation", async (testCtx) => {
      if (!ready) testCtx.skip();

      const perSetGrams = 6.25;
      const setsOrdered = 3;
      const requiredGrams = roundWeightGrams(perSetGrams * setsOrdered);

      const lot = await createMetalLot(ctx, { weightGrams: 100 });
      const stockBefore = lot.weightGrams;

      const design = await createApprovedDesign(ctx, {
        weightGramsPerPc: perSetGrams,
      });

      const computedPerSet = await computeMetalPerSetGramsFromDesign(design.id);
      expect(computedPerSet).toBe(perSetGrams);

      const run = await createProductionRun(
        { designId: design.id, setsOrdered },
        ctx.headOfficeBranchId,
        ctx.organizationId,
        ctx.actor,
      );

      const lotAfter = await prisma.metalLot.findUnique({
        where: { id: lot.id },
      });
      expect(lotAfter?.weightGrams).toBe(
        roundWeightGrams(stockBefore - requiredGrams),
      );

      const auditSum = await prisma.rawStockAuditLog.aggregate({
        where: {
          stockType: "Metal",
          stockId: lot.id,
          reason: { contains: run.runNo },
        },
        _sum: { delta: true },
      });
      expect(auditSum._sum.delta).toBe(-requiredGrams);

      const runRow = await prisma.productionRun.findUnique({
        where: { id: run.id },
      });
      expect(runRow?.metalInventoryDeducted).toBe(true);
    });

    it("blocks run creation when raw metal is insufficient", async (testCtx) => {
      if (!ready) testCtx.skip();

      await prisma.metalLot.deleteMany({
        where: { branchId: ctx.headOfficeBranchId },
      });

      const perSetGrams = 10;
      const setsOrdered = 5;
      const requiredGrams = perSetGrams * setsOrdered;

      await createMetalLot(ctx, { weightGrams: requiredGrams - 1 });

      const design = await createApprovedDesign(ctx, {
        weightGramsPerPc: perSetGrams,
        code: `DES-LOW-${ctx.suffix}`,
      });

      await expect(
        createProductionRun(
          { designId: design.id, setsOrdered },
          ctx.headOfficeBranchId,
          ctx.organizationId,
          ctx.actor,
        ),
      ).rejects.toThrow(/Insufficient Gold 22K metal/);

      const lots = await prisma.metalLot.findMany({
        where: { branchId: ctx.headOfficeBranchId, metalType: "Gold", purity: "22K" },
      });
      expect(sumMetalLotGrams(lots)).toBeLessThan(requiredGrams);
    });
  },
);
