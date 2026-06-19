import { ProductionRunStatusEnum } from "@prisma/client";
import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import type {
  FinishedGoodsDefaults,
  NewProductionRunInput,
  ProductionRun,
  ProductionRunItem,
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
  deductPendingRawMaterialForRunInTx,
  deductRawMaterialForItemInTx,
} from "./raw-material.js";
import {
  buildFinishedGoodsFromRun,
  createFinishedGoodsInTx,
} from "./finished-goods.js";
import { ProductionRunError } from "./errors.js";
import {
  expectedElementWeight,
  requireWeightOverrideNote,
} from "../weight-reconciliation.js";

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
  design: { select: { code: true, name: true, category: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
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
});

const toProductionRun = (run: {
  id: string;
  runNo: string;
  designId: string;
  setsOrdered: number;
  status: string;
  finishedGoodsProductId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  design?: { code: string; name: string | null; category: string | null };
  items?: Array<Parameters<typeof toProductionRunItem>[0]>;
}): ProductionRun => {
  const items = (run.items ?? []).map(toProductionRunItem);
  const castingsReceived = items.filter((i) => i.castingReceived).length;

  return {
    id: run.id,
    runNo: run.runNo,
    designId: run.designId,
    designCode: run.design?.code ?? "",
    designName: run.design?.name ?? undefined,
    designCategory: run.design?.category ?? undefined,
    setsOrdered: run.setsOrdered,
    status: run.status as ProductionRunStatus,
    items,
    castingsReceived,
    castingsTotal: items.length,
    finishedGoodsProductId: run.finishedGoodsProductId ?? undefined,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
};

export const listProductionRuns = async (): Promise<ProductionRun[]> => {
  const runs = await prisma.productionRun.findMany({
    include: runInclude,
    orderBy: { createdAt: "desc" },
  });
  return runs.map(toProductionRun);
};

export const getProductionRun = async (id: string): Promise<ProductionRun> => {
  const run = await prisma.productionRun.findUnique({
    where: { id },
    include: runInclude,
  });
  if (!run) throw new ProductionRunError("Production run not found.", 404);
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
    include: { elements: { orderBy: { sortOrder: "asc" } } },
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

  const runNo = await generateProductionRunNo();

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
        })),
      },
    },
    include: runInclude,
  });

  return toProductionRun(run);
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

  if (completingRun && input.createFinishedGoods) {
    if (!input.finishedGoods) {
      throw new ProductionRunError(
        "Finished goods details are required when creating inventory on completion.",
      );
    }
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
      const runWithItems = await tx.productionRun.findUniqueOrThrow({
        where: { id },
        include: { items: true },
      });
      await deductPendingRawMaterialForRunInTx(
        tx,
        {
          id: runWithItems.id,
          runNo: runWithItems.runNo,
          branchId: runWithItems.branchId,
          items: runWithItems.items,
        },
        actor,
      );

      if (input.createFinishedGoods && input.finishedGoods) {
        await createFinishedGoodsInTx(
          tx,
          {
            id: runWithItems.id,
            runNo: runWithItems.runNo,
            branchId: runWithItems.branchId,
            setsOrdered: runWithItems.setsOrdered,
            finishedGoodsProductId: runWithItems.finishedGoodsProductId,
          },
          input.finishedGoods,
        );
      }
    }
  });

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
