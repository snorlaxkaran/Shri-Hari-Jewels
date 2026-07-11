import { prisma } from "../db.js";
import { computeMetalPerSetGramsFromDesign } from "./metal-weight.js";
import { getAvailableMetalGramsForDesign } from "./metal-lot-matching.js";

const roundWeight = (value: number) => Math.round(value * 100) / 100;

export type MetalReservationStatus = {
  reserved: boolean;
  perSetGrams: number;
  requiredGrams: number;
  deductedGrams: number;
  availableGrams: number;
  error?: string;
};

export const getRunMetalReservationStatus = async (run: {
  id: string;
  runNo: string;
  branchId: string;
  designId: string;
  setsOrdered: number;
  design: { metal: string | null; purity: string | null };
}): Promise<MetalReservationStatus> => {
  const perSetGrams = await computeMetalPerSetGramsFromDesign(run.designId);
  const requiredGrams = roundWeight(perSetGrams * run.setsOrdered);

  const audits = await prisma.rawStockAuditLog.findMany({
    where: {
      stockType: "Metal",
      reason: { contains: run.runNo },
      delta: { lt: 0 },
    },
    select: { delta: true },
  });
  const deductedGrams = roundWeight(
    audits.reduce((sum, row) => sum + -row.delta, 0),
  );

  const metal = run.design.metal ?? "";
  const purity = run.design.purity ?? "";
  const availableGrams =
    metal && purity
      ? await getAvailableMetalGramsForDesign(run.branchId, metal, purity)
      : 0;

  if (perSetGrams <= 0) {
    return {
      reserved: false,
      perSetGrams: 0,
      requiredGrams: 0,
      deductedGrams,
      availableGrams,
      error:
        "Design BOM has no metal weight per set. Add motif weights in the design builder.",
    };
  }

  if (deductedGrams + 0.001 >= requiredGrams) {
    return {
      reserved: true,
      perSetGrams,
      requiredGrams,
      deductedGrams,
      availableGrams,
    };
  }

  let error: string | undefined;
  if (!metal || !purity) {
    error = "Design metal and purity are not set.";
  } else if (availableGrams + deductedGrams + 0.001 < requiredGrams) {
    error = `Need ${requiredGrams}g ${metal} ${purity} (${perSetGrams}g × ${run.setsOrdered} sets) but only ${roundWeight(availableGrams + deductedGrams)}g is available in Raw Inventory.`;
  } else {
    error = `${requiredGrams}g not yet reserved from Raw Inventory.`;
  }

  return {
    reserved: false,
    perSetGrams,
    requiredGrams,
    deductedGrams,
    availableGrams,
    error,
  };
};
