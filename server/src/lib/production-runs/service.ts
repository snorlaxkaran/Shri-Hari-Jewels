import { DesignBuilderStage, ProductionRunStatusEnum } from "@prisma/client";
import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import type {
  FinishedGoodsDefaults,
  NewProductionRunInput,
  ProductionRun,
  ProductionRunItem,
  ProductionRunStageLog,
  ProductionRunStatus,
  UpdateProductionRunInput,
  UpdateProductionRunItemInput,
} from "../../types.js";
import {
  isValidDesignMetal,
  isValidDesignPurity,
} from "../designs/validation.js";
import { generateProductionRunNo } from "./run-no.js";
import {
  deductRawMaterialForItemInTx,
  validateLotSelectionForItem,
} from "./raw-material.js";
import { checkBulkStoneStock } from "./bulk-stone-stock.js";
import {
  buildFinishedGoodsFromRun,
} from "./finished-goods.js";
import {
  ensureCompletedRunInventory,
  finalizeProductionRunAfterTx,
  finalizeProductionRunInTx,
  repairCompletedRunInventorySkus,
} from "./run-completion.js";
import { ProductionRunError } from "./errors.js";
import {
  expectedElementWeight,
  requireWeightOverrideNote,
} from "../weight-reconciliation.js";
import { toApiProductionRunStage } from "./stages.js";

export { ProductionRunError } from "./errors.js";

export const PRODUCTION_RUN_STATUSES: ProductionRunStatus[] = [
  "Open",
  "In Progress",
  "Completed",
  "Cancelled",
];

const toDbRunStatus = (
  status?: ProductionRunStatus,
): ProductionRunStatusEnum | undefined => {
  if (!status) return undefined;
  if (status === "In Progress") return ProductionRunStatusEnum.InProgress;
  return status as ProductionRunStatusEnum;
};

const runInclude = {
  design: {
    select: {
      code: true,
      name: true,
      category: true,
      metal: true,
      purity: true,
      cadFileUrl: true,
      moldPhotoUrl: true,
      finishedPhotoUrl: true,
      finishedPhotoUrls: true,
    },
  },
  items: { orderBy: { sortOrder: "asc" as const } },
  stageLogs: { orderBy: { createdAt: "asc" as const } },
};

const toStageLog = (row: {
  id: string;
  productionRunId: string;
  stage: string;
  notes: string | null;
  performedById: string | null;
  performedByName: string;
  createdAt: Date;
}): ProductionRunStageLog => ({
  id: row.id,
  productionRunId: row.productionRunId,
  stage: toApiProductionRunStage(row.stage as Parameters<typeof toApiProductionRunStage>[0]),
  notes: row.notes ?? undefined,
  performedById: row.performedById ?? undefined,
  performedByName: row.performedByName,
  createdAt: row.createdAt.toISOString(),
});

const parseStageCheckoffs = (
  value: unknown,
): Partial<Record<import("../../types.js").ProductionRunStage, boolean>> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Partial<Record<import("../../types.js").ProductionRunStage, boolean>> =
    {};
  for (const [key, done] of Object.entries(value as Record<string, unknown>)) {
    if (typeof done === "boolean") {
      out[key as import("../../types.js").ProductionRunStage] = done;
    }
  }
  return out;
};

const toProductionRunItem = (item: {
  id: string;
  productionRunId: string;
  elementName: string;
  elementType: string;
  qtyPerSet: number;
  totalQty: number;
  unitValue: { toString(): string } | null;
  weightGramsPerPc: number | null;
  productionDate: Date | null;
  waxCount: number | null;
  czStones: number | null;
  czWeight: number | null;
  castingReceived: boolean;
  metalLotId: string | null;
  stoneLotId: string | null;
  metalWeightGrams: number | null;
  rawMaterialDeducted: boolean;
  sortOrder: number;
  motifId?: string | null;
  imageUrl?: string | null;
  stageCheckoffs?: unknown;
}): ProductionRunItem => ({
  id: item.id,
  productionRunId: item.productionRunId,
  elementName: item.elementName,
  elementType: item.elementType,
  qtyPerSet: item.qtyPerSet,
  totalQty: item.totalQty,
  unitValue:
    item.unitValue != null
      ? moneyToNumber(String(item.unitValue))
      : undefined,
  weightGramsPerPc: item.weightGramsPerPc ?? undefined,
  productionDate: item.productionDate?.toISOString(),
  waxCount: item.waxCount ?? undefined,
  czStones: item.czStones ?? undefined,
  czWeight: item.czWeight ?? undefined,
  castingReceived: item.castingReceived,
  metalLotId: item.metalLotId ?? undefined,
  stoneLotId: item.stoneLotId ?? undefined,
  metalWeightGrams: item.metalWeightGrams ?? undefined,
  rawMaterialDeducted: item.rawMaterialDeducted,
  sortOrder: item.sortOrder,
  motifId: item.motifId ?? undefined,
  imageUrl: item.imageUrl ?? undefined,
  stageCheckoffs: parseStageCheckoffs(item.stageCheckoffs),
});

const toProductionRun = (run: {
  id: string;
  runNo: string;
  designId: string;
  setsOrdered: number;
  status: string;
  currentStage: Parameters<typeof toApiProductionRunStage>[0];
  finishedGoodsProductId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  design?: {
    code: string;
    name: string | null;
    category: string | null;
    metal?: string | null;
    purity?: string | null;
    cadFileUrl?: string | null;
    moldPhotoUrl?: string | null;
    finishedPhotoUrl?: string | null;
    finishedPhotoUrls?: string[];
  };
  items?: Array<Parameters<typeof toProductionRunItem>[0]>;
  stageLogs?: Array<Parameters<typeof toStageLog>[0]>;
  stoneStockWarnings?: import("../../types.js").BulkStoneStockWarning[];
}): ProductionRun => {
  const items = (run.items ?? []).map(toProductionRunItem);
  const castingItems = items.filter((i) => i.elementType === "Casting");
  const castingsReceived = castingItems.filter((i) => i.castingReceived).length;
  const finishedPhotoUrls = [
    ...(run.design?.finishedPhotoUrls ?? []),
    ...(run.design?.finishedPhotoUrl ? [run.design.finishedPhotoUrl] : []),
  ].filter((url, index, all) => url && all.indexOf(url) === index);

  return {
    id: run.id,
    runNo: run.runNo,
    designId: run.designId,
    designCode: run.design?.code ?? "",
    designName: run.design?.name ?? undefined,
    designCategory: run.design?.category ?? undefined,
    designMetal: run.design?.metal ?? undefined,
    designPurity: run.design?.purity ?? undefined,
    designPhotos:
      run.design?.cadFileUrl ||
      run.design?.moldPhotoUrl ||
      finishedPhotoUrls.length
        ? {
            cadFileUrl: run.design?.cadFileUrl ?? undefined,
            moldPhotoUrl: run.design?.moldPhotoUrl ?? undefined,
            finishedPhotoUrl: run.design?.finishedPhotoUrl ?? undefined,
            finishedPhotoUrls:
              finishedPhotoUrls.length > 0 ? finishedPhotoUrls : undefined,
          }
        : undefined,
    setsOrdered: run.setsOrdered,
    status: run.status as ProductionRunStatus,
    currentStage: toApiProductionRunStage(run.currentStage),
    stageLogs: (run.stageLogs ?? []).map(toStageLog),
    items,
    castingsReceived,
    castingsTotal: castingItems.length,
    finishedGoodsProductId: run.finishedGoodsProductId ?? undefined,
    stoneStockWarnings: run.stoneStockWarnings,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
};

export const syncCompletedRunsInventory = async (
  actor: { id: string; name: string },
): Promise<number> => {
  await repairCompletedRunInventorySkus();

  const runs = await prisma.productionRun.findMany({
    where: {
      status: "Completed",
      finishedGoodsProductId: null,
    },
    select: { id: true },
  });

  let synced = 0;
  for (const run of runs) {
    const didSync = await ensureCompletedRunInventory(run.id, actor);
    if (didSync) synced += 1;
  }
  return synced;
};

export const listProductionRuns = async (): Promise<ProductionRun[]> => {
  await syncCompletedRunsInventory({
    id: "system",
    name: "Production completion sync",
  });

  const runs = await prisma.productionRun.findMany({
    include: runInclude,
    orderBy: { createdAt: "desc" },
  });
  return runs.map(toProductionRun);
};

export const getProductionRun = async (id: string): Promise<ProductionRun> => {
  let run = await prisma.productionRun.findUnique({
    where: { id },
    include: runInclude,
  });
  if (!run) throw new ProductionRunError("Production run not found.", 404);

  if (run.status === "Completed" && !run.finishedGoodsProductId) {
    await ensureCompletedRunInventory(id, {
      id: "system",
      name: "Production completion sync",
    });
    run = await prisma.productionRun.findUniqueOrThrow({
      where: { id },
      include: runInclude,
    });
  }

  const needsImageBackfill = run.items.some(
    (item) => !item.imageUrl || !item.motifId,
  );
  if (needsImageBackfill) {
    const elements = await prisma.designElement.findMany({
      where: { designId: run.designId },
      orderBy: { sortOrder: "asc" },
      include: { motif: { select: { id: true, imageUrl: true } } },
    });

    await Promise.all(
      run.items.map(async (item) => {
        const element = elements[item.sortOrder];
        if (!element) return;
        const motifId = item.motifId ?? element.motifId;
        const imageUrl = item.imageUrl ?? element.motif?.imageUrl ?? null;
        if (
          motifId === item.motifId &&
          imageUrl === item.imageUrl
        ) {
          return;
        }
        await prisma.productionRunItem.update({
          where: { id: item.id },
          data: { motifId, imageUrl },
        });
        item.motifId = motifId;
        item.imageUrl = imageUrl;
      }),
    );
  }

  return toProductionRun(run);
};

export const createProductionRun = async (
  input: NewProductionRunInput,
  branchId: string,
): Promise<ProductionRun> => {
  if (!input.designId) {
    throw new ProductionRunError("Design is required.");
  }
  if (!input.setsOrdered || input.setsOrdered < 1) {
    throw new ProductionRunError("Sets ordered must be at least 1.");
  }

  const design = await prisma.design.findUnique({
    where: { id: input.designId },
    include: {
      elements: {
        orderBy: { sortOrder: "asc" },
        include: { motif: { select: { id: true, imageUrl: true } } },
      },
    },
  });
  if (!design) throw new ProductionRunError("Design not found.", 404);
  if (design.elements.length === 0) {
    throw new ProductionRunError(
      "Design has no elements. Add a bill of materials first.",
    );
  }
  if (!design.metal || !isValidDesignMetal(design.metal)) {
    throw new ProductionRunError(
      "Design metal must be set before starting a production run.",
    );
  }
  if (!design.purity || !isValidDesignPurity(design.purity)) {
    throw new ProductionRunError(
      "Design purity must be set before starting a production run.",
    );
  }
  if (design.builderStage !== DesignBuilderStage.Complete) {
    throw new ProductionRunError(
      "Complete the design builder before starting a production run.",
    );
  }

  const runNo = await generateProductionRunNo();
  const stoneStockWarnings = await checkBulkStoneStock(
    input.designId,
    input.setsOrdered,
  );

  const run = await prisma.productionRun.create({
    data: {
      branchId,
      runNo,
      designId: input.designId,
      setsOrdered: input.setsOrdered,
      status: "Open",
      items: {
        create: design.elements.map((el, index) => ({
          elementName: el.name,
          elementType: el.type,
          qtyPerSet: el.qtyPerSet,
          totalQty: el.qtyPerSet * input.setsOrdered,
          unitValue: el.unitValue,
          weightGramsPerPc: el.weightGramsPerPc,
          sortOrder: index,
          motifId: el.motifId,
          imageUrl: el.motif?.imageUrl ?? null,
          stageCheckoffs: {},
        })),
      },
    },
    include: runInclude,
  });

  return toProductionRun({ ...run, stoneStockWarnings });
};

export const getFinishedGoodsDefaults = async (
  id: string,
): Promise<FinishedGoodsDefaults> => {
  const run = await prisma.productionRun.findUnique({
    where: { id },
    include: {
      design: {
        select: {
          code: true,
          name: true,
          category: true,
          metal: true,
          purity: true,
          makingChargesPerSet: true,
        },
      },
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          elementName: true,
          elementType: true,
          qtyPerSet: true,
          unitValue: true,
          weightGramsPerPc: true,
          metalWeightGrams: true,
          metalLotId: true,
          czWeight: true,
        },
      },
    },
  });
  if (!run) throw new ProductionRunError("Production run not found.", 404);

  const metalLots = await prisma.metalLot.findMany({
    where: { branchId: run.branchId },
    select: {
      id: true,
      metalType: true,
      purity: true,
      currentRate: true,
    },
  });

  const calculated = buildFinishedGoodsFromRun(run, metalLots);

  return {
    name: calculated.name,
    category: calculated.category,
    metal: calculated.metal,
    purity: calculated.purity,
    weightGrams: calculated.weightGrams,
    makingCharges: calculated.makingCharges,
    stoneCarat: calculated.stoneCarat,
    price: calculated.price,
    images: [],
    quantity: calculated.quantity,
    runNo: run.runNo,
    designCode: run.design.code,
    sku: calculated.sku,
    priceBreakdown: calculated.priceBreakdown,
  };
};

const validateFinishedGoodsInput = (input: {
  name?: string;
  category?: string;
  metal?: string;
  purity?: string;
  weightGrams?: number;
  makingCharges?: number;
  price?: number;
}) => {
  if (!input.name?.trim()) {
    throw new ProductionRunError("Product name is required.");
  }
  if (!input.category?.trim()) {
    throw new ProductionRunError("Product category is required.");
  }
  if (!input.metal) throw new ProductionRunError("Metal type is required.");
  if (!input.purity) throw new ProductionRunError("Purity is required.");
  if (input.weightGrams === undefined || input.weightGrams < 0) {
    throw new ProductionRunError("Weight cannot be negative.");
  }
  if (input.makingCharges === undefined || input.makingCharges < 0) {
    throw new ProductionRunError("Making charges cannot be negative.");
  }
  if (!input.price || input.price <= 0) {
    throw new ProductionRunError("Price must be greater than zero.");
  }
};

export const updateProductionRun = async (
  id: string,
  input: UpdateProductionRunInput,
  actor: { id: string; name: string },
): Promise<ProductionRun> => {
  const existing = await prisma.productionRun.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing) throw new ProductionRunError("Production run not found.", 404);

  if (input.status && !PRODUCTION_RUN_STATUSES.includes(input.status)) {
    throw new ProductionRunError("Invalid production run status.");
  }

  if (input.setsOrdered !== undefined && input.setsOrdered < 1) {
    throw new ProductionRunError("Sets ordered must be at least 1.");
  }

  const setsChanged =
    input.setsOrdered !== undefined &&
    input.setsOrdered !== existing.setsOrdered;

  const completingRun =
    input.status === "Completed" &&
    existing.status !== ProductionRunStatusEnum.Completed;

  if (completingRun && input.finishedGoods) {
    validateFinishedGoodsInput(input.finishedGoods);

    const runForPricing = await prisma.productionRun.findUnique({
      where: { id },
      include: {
        design: {
          select: {
            code: true,
            name: true,
            category: true,
            metal: true,
            purity: true,
            makingChargesPerSet: true,
          },
        },
        items: {
          orderBy: { sortOrder: "asc" },
          select: {
            elementName: true,
            elementType: true,
            qtyPerSet: true,
            unitValue: true,
            weightGramsPerPc: true,
            metalWeightGrams: true,
            metalLotId: true,
            czWeight: true,
          },
        },
      },
    });
    if (!runForPricing) {
      throw new ProductionRunError("Production run not found.", 404);
    }
    const metalLots = await prisma.metalLot.findMany({
      where: { branchId: runForPricing.branchId },
      select: {
        id: true,
        metalType: true,
        purity: true,
        currentRate: true,
      },
    });
    const expectedFinishedGoods = buildFinishedGoodsFromRun(
      runForPricing,
      metalLots,
    );

    try {
      requireWeightOverrideNote(
        input.finishedGoods.weightGrams,
        expectedFinishedGoods.weightGrams,
        input.finishedGoods.weightOverrideNote,
        "SKU weight",
      );
    } catch (error) {
      throw new ProductionRunError(
        error instanceof Error ? error.message : "Invalid SKU weight.",
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.productionRun.update({
      where: { id },
      data: {
        status: toDbRunStatus(input.status),
        setsOrdered: input.setsOrdered,
      },
    });

    if (setsChanged && input.setsOrdered !== undefined) {
      for (const item of existing.items) {
        await tx.productionRunItem.update({
          where: { id: item.id },
          data: { totalQty: item.qtyPerSet * input.setsOrdered! },
        });
      }
    }

    if (completingRun) {
      await finalizeProductionRunInTx(
        tx,
        id,
        actor,
        input.finishedGoods,
      );
    }
  });

  if (completingRun) {
    await finalizeProductionRunAfterTx(existing.designId, existing.setsOrdered);
  }

  return getProductionRun(id);
};

export const updateProductionRunItem = async (
  runId: string,
  itemId: string,
  input: UpdateProductionRunItemInput,
  actor: { id: string; name: string },
): Promise<ProductionRun> => {
  const run = await prisma.productionRun.findUnique({
    where: { id: runId },
    include: { items: true },
  });
  if (!run) throw new ProductionRunError("Production run not found.", 404);

  const item = run.items.find((row) => row.id === itemId);
  if (!item) throw new ProductionRunError("Production run item not found.", 404);

  if (
    item.elementType === "Casting" &&
    input.metalWeightGrams !== undefined &&
    input.metalWeightGrams !== null
  ) {
    const expected = expectedElementWeight(
      item.weightGramsPerPc,
      item.qtyPerSet,
    );
    try {
      requireWeightOverrideNote(
        input.metalWeightGrams,
        expected,
        input.metalWeightOverrideNote,
        `Casting weight for "${item.elementName}"`,
      );
    } catch (error) {
      throw new ProductionRunError(
        error instanceof Error ? error.message : "Invalid casting weight.",
      );
    }
  }

  if (item.rawMaterialDeducted && input.castingReceived === false) {
    throw new ProductionRunError(
      "Cannot unmark casting received after raw material has been deducted.",
    );
  }

  const markingCastingReceived =
    input.castingReceived === true && !item.castingReceived;

  if (markingCastingReceived) {
    const itemForValidation = {
      ...item,
      metalLotId:
        input.metalLotId !== undefined ? input.metalLotId : item.metalLotId,
      stoneLotId:
        input.stoneLotId !== undefined ? input.stoneLotId : item.stoneLotId,
      metalWeightGrams:
        input.metalWeightGrams !== undefined
          ? input.metalWeightGrams
          : item.metalWeightGrams,
      czWeight: input.czWeight !== undefined ? input.czWeight : item.czWeight,
    };
    validateLotSelectionForItem(itemForValidation);
  }

  const mergedStageCheckoffs =
    input.stageCheckoffs === undefined
      ? undefined
      : {
          ...parseStageCheckoffs(item.stageCheckoffs),
          ...input.stageCheckoffs,
        };

  await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.productionRunItem.update({
      where: { id: itemId },
      data: {
        productionDate:
          input.productionDate === undefined
            ? undefined
            : input.productionDate
              ? new Date(input.productionDate)
              : null,
        waxCount: input.waxCount === undefined ? undefined : input.waxCount,
        czStones: input.czStones === undefined ? undefined : input.czStones,
        czWeight: input.czWeight === undefined ? undefined : input.czWeight,
        castingReceived: input.castingReceived,
        metalLotId:
          input.metalLotId === undefined ? undefined : input.metalLotId,
        stoneLotId:
          input.stoneLotId === undefined ? undefined : input.stoneLotId,
        metalWeightGrams:
          input.metalWeightGrams === undefined
            ? undefined
            : input.metalWeightGrams,
        stageCheckoffs:
          mergedStageCheckoffs === undefined ? undefined : mergedStageCheckoffs,
      },
    });

    if (markingCastingReceived && !updatedItem.rawMaterialDeducted) {
      await deductRawMaterialForItemInTx(
        tx,
        updatedItem,
        {
          id: run.id,
          runNo: run.runNo,
          branchId: run.branchId,
        },
        actor,
      );
    }
  });

  return getProductionRun(runId);
};

export const deleteProductionRun = async (id: string): Promise<void> => {
  const existing = await prisma.productionRun.findUnique({ where: { id } });
  if (!existing) throw new ProductionRunError("Production run not found.", 404);
  await prisma.productionRun.delete({ where: { id } });
};

export const exportProductionRunCsv = async (id: string): Promise<string> => {
  const run = await getProductionRun(id);

  const headers = [
    "Element",
    "Type",
    "Qty/Set",
    "Total Qty",
    "Date",
    "Wax Moulds",
    "CZ Stones",
    "CZ Weight (ct)",
    "Casting Received",
  ];

  const escapeCsv = (value: string | number | boolean) => {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN");
  };

  const rows = run.items.map((item) =>
    [
      item.elementName,
      item.elementType,
      item.qtyPerSet,
      item.totalQty,
      formatDate(item.productionDate),
      item.waxCount ?? "",
      item.czStones ?? "",
      item.czWeight ?? "",
      item.castingReceived ? "Yes" : "No",
    ]
      .map(escapeCsv)
      .join(","),
  );

  const meta = [
    `# Production Run: ${run.runNo}`,
    `# Design: ${run.designCode}${run.designName ? ` — ${run.designName}` : ""}`,
    `# Sets Ordered: ${run.setsOrdered}`,
    `# Status: ${run.status}`,
    "",
  ];

  return [...meta, headers.join(","), ...rows].join("\n");
};
