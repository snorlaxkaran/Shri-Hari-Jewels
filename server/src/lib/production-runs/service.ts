import { prisma } from "../db.js";
import type {
  NewProductionRunInput,
  ProductionRun,
  ProductionRunItem,
  ProductionRunStatus,
  UpdateProductionRunInput,
  UpdateProductionRunItemInput,
} from "../../types.js";
import { generateProductionRunNo } from "./run-no.js";

export const PRODUCTION_RUN_STATUSES: ProductionRunStatus[] = [
  "Open",
  "In Progress",
  "Completed",
  "Cancelled",
];

export class ProductionRunError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "ProductionRunError";
  }
}

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
  productionDate: Date | null;
  waxCount: number | null;
  czStones: number | null;
  czWeight: number | null;
  castingReceived: boolean;
  sortOrder: number;
}): ProductionRunItem => ({
  id: item.id,
  productionRunId: item.productionRunId,
  elementName: item.elementName,
  elementType: item.elementType,
  qtyPerSet: item.qtyPerSet,
  totalQty: item.totalQty,
  productionDate: item.productionDate?.toISOString(),
  waxCount: item.waxCount ?? undefined,
  czStones: item.czStones ?? undefined,
  czWeight: item.czWeight ?? undefined,
  castingReceived: item.castingReceived,
  sortOrder: item.sortOrder,
});

const toProductionRun = (run: {
  id: string;
  runNo: string;
  designId: string;
  setsOrdered: number;
  status: string;
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
          sortOrder: index,
        })),
      },
    },
    include: runInclude,
  });

  return toProductionRun(run);
};

export const updateProductionRun = async (
  id: string,
  input: UpdateProductionRunInput,
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

  await prisma.$transaction(async (tx) => {
    await tx.productionRun.update({
      where: { id },
      data: {
        status: input.status,
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
  });

  return getProductionRun(id);
};

export const updateProductionRunItem = async (
  runId: string,
  itemId: string,
  input: UpdateProductionRunItemInput,
): Promise<ProductionRun> => {
  const item = await prisma.productionRunItem.findFirst({
    where: { id: itemId, productionRunId: runId },
  });
  if (!item) throw new ProductionRunError("Production run item not found.", 404);

  await prisma.productionRunItem.update({
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
    },
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
