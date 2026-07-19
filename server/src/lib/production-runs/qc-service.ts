import type { NcrSeverity, QcResult } from "@prisma/client";
import { prisma } from "../db.js";
import { assertProductionRunInOrganization } from "../organizations/access.js";
import { ProductionRunError } from "./errors.js";
import { QC_CHECKLIST } from "./stage-config.js";
import { rejectProductionRunStage } from "./stage-service.js";
import {
  isStageBefore,
  toApiProductionRunStage,
  toDbProductionRunStage,
  type ProductionRunStage,
} from "./stages.js";

type Actor = { id: string; name: string };

export type QcRecordResult = {
  id: string;
  productionRunId: string;
  productionRunItemId: string;
  result: QcResult;
  checklistResults: Record<string, boolean>;
  inspectedByName: string;
  photoUrls: string[];
  createdAt: string;
  ncr?: NonConformanceReportResult;
};

export type NonConformanceReportResult = {
  id: string;
  qcRecordId: string;
  ncrNo: string;
  severity: NcrSeverity;
  failedCriteria: string[];
  description: string;
  rootCause?: string;
  correctiveAction?: string;
  sentToStage: ProductionRunStage;
  resolvedAt?: string;
  createdByName: string;
  createdAt: string;
  elementName?: string;
};

export type SubmitQcInput = {
  checklistResults: Record<string, boolean>;
  inspectedByName: string;
  photoUrls?: string[];
  severity?: NcrSeverity;
  description?: string;
  failedCriteria?: string[];
  sentToStage?: ProductionRunStage;
};

export class QcError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "QcError";
  }
}

const generateNcrNo = async (organizationId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `NCR-${year}-`;

  const existing = await prisma.nonConformanceReport.findMany({
    where: { ncrNo: { startsWith: prefix }, qcRecord: { productionRun: { organizationId } } },
    select: { ncrNo: true },
  });

  const sequences = existing
    .map((item) => parseInt(item.ncrNo.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));

  const next = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
};

const toQcRecord = (row: {
  id: string;
  productionRunId: string;
  productionRunItemId: string;
  result: QcResult;
  checklistResults: unknown;
  inspectedByName: string;
  photoUrls: string[];
  createdAt: Date;
  ncr?: {
    id: string;
    qcRecordId: string;
    ncrNo: string;
    severity: NcrSeverity;
    failedCriteria: string[];
    description: string;
    rootCause: string | null;
    correctiveAction: string | null;
    sentToStage: string;
    resolvedAt: Date | null;
    createdByName: string;
    createdAt: Date;
  } | null;
}): QcRecordResult => ({
  id: row.id,
  productionRunId: row.productionRunId,
  productionRunItemId: row.productionRunItemId,
  result: row.result,
  checklistResults:
    row.checklistResults && typeof row.checklistResults === "object" && !Array.isArray(row.checklistResults)
      ? (row.checklistResults as Record<string, boolean>)
      : {},
  inspectedByName: row.inspectedByName,
  photoUrls: row.photoUrls,
  createdAt: row.createdAt.toISOString(),
  ncr: row.ncr
    ? {
        id: row.ncr.id,
        qcRecordId: row.ncr.qcRecordId,
        ncrNo: row.ncr.ncrNo,
        severity: row.ncr.severity,
        failedCriteria: row.ncr.failedCriteria,
        description: row.ncr.description,
        rootCause: row.ncr.rootCause ?? undefined,
        correctiveAction: row.ncr.correctiveAction ?? undefined,
        sentToStage: toApiProductionRunStage(
          row.ncr.sentToStage as Parameters<typeof toApiProductionRunStage>[0],
        ),
        resolvedAt: row.ncr.resolvedAt?.toISOString(),
        createdByName: row.ncr.createdByName,
        createdAt: row.ncr.createdAt.toISOString(),
      }
    : undefined,
});

const toNcr = (
  row: {
    id: string;
    qcRecordId: string;
    ncrNo: string;
    severity: NcrSeverity;
    failedCriteria: string[];
    description: string;
    rootCause: string | null;
    correctiveAction: string | null;
    sentToStage: string;
    resolvedAt: Date | null;
    createdByName: string;
    createdAt: Date;
  },
  elementName?: string,
): NonConformanceReportResult => ({
  id: row.id,
  qcRecordId: row.qcRecordId,
  ncrNo: row.ncrNo,
  severity: row.severity,
  failedCriteria: row.failedCriteria,
  description: row.description,
  rootCause: row.rootCause ?? undefined,
  correctiveAction: row.correctiveAction ?? undefined,
  sentToStage: toApiProductionRunStage(
    row.sentToStage as Parameters<typeof toApiProductionRunStage>[0],
  ),
  resolvedAt: row.resolvedAt?.toISOString(),
  createdByName: row.createdByName,
  createdAt: row.createdAt.toISOString(),
  elementName,
});

const validateChecklist = (checklistResults: Record<string, boolean>) => {
  for (const criterion of QC_CHECKLIST) {
    if (typeof checklistResults[criterion] !== "boolean") {
      throw new QcError(`Missing checklist result for "${criterion}".`);
    }
  }
};

const getInspectorWarning = async (
  productionRunId: string,
  inspectedByName: string,
): Promise<string | undefined> => {
  const priorLog = await prisma.productionRunStageLog.findFirst({
    where: {
      productionRunId,
      action: "Completed",
      stage: { not: toDbProductionRunStage("Quality Check") },
      karigarName: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });
  if (
    priorLog?.karigarName &&
    priorLog.karigarName.trim().toLowerCase() === inspectedByName.trim().toLowerCase()
  ) {
    return "Same person who assembled this piece is also inspecting it — consider independent verification";
  }
  return undefined;
};

export const listQcRecordsForRun = async (
  productionRunId: string,
  organizationId: string,
): Promise<QcRecordResult[]> => {
  await assertProductionRunInOrganization(productionRunId, organizationId);
  const rows = await prisma.productionRunQcRecord.findMany({
    where: { productionRunId },
    include: { ncr: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toQcRecord);
};

export const listNcrsForRun = async (
  productionRunId: string,
  organizationId: string,
): Promise<NonConformanceReportResult[]> => {
  await assertProductionRunInOrganization(productionRunId, organizationId);
  const rows = await prisma.nonConformanceReport.findMany({
    where: { qcRecord: { productionRunId } },
    include: {
      qcRecord: {
        include: {
          productionRunItem: { select: { elementName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) =>
    toNcr(row, row.qcRecord.productionRunItem.elementName),
  );
};

export const submitProductionRunItemQc = async (
  productionRunId: string,
  productionRunItemId: string,
  input: SubmitQcInput,
  actor: Actor,
  organizationId: string,
): Promise<{ qcRecord: QcRecordResult; warning?: string; rejectedToStage?: ProductionRunStage }> => {
  await assertProductionRunInOrganization(productionRunId, organizationId);

  if (!input.inspectedByName?.trim()) {
    throw new QcError("Inspector name is required.");
  }

  validateChecklist(input.checklistResults);

  const run = await prisma.productionRun.findUnique({
    where: { id: productionRunId },
    include: { items: true },
  });
  if (!run) throw new QcError("Production run not found.", 404);

  const currentStage = toApiProductionRunStage(run.currentStage);
  if (currentStage !== "Quality Check") {
    throw new QcError(
      `QC can only be submitted when the run is at Quality Check (currently at "${currentStage}").`,
    );
  }

  const item = run.items.find((i) => i.id === productionRunItemId);
  if (!item) throw new QcError("Production run item not found.", 404);

  const failedCriteria = QC_CHECKLIST.filter((c) => input.checklistResults[c] === false);
  const allPassed = failedCriteria.length === 0;
  const warning = await getInspectorWarning(productionRunId, input.inspectedByName.trim());

  if (allPassed) {
    const created = await prisma.productionRunQcRecord.create({
      data: {
        productionRunId,
        productionRunItemId,
        result: "Pass",
        checklistResults: input.checklistResults,
        inspectedByName: input.inspectedByName.trim(),
        photoUrls: input.photoUrls ?? [],
      },
      include: { ncr: true },
    });
    return { qcRecord: toQcRecord(created), warning };
  }

  if (!input.severity) {
    throw new QcError("Severity is required when any checklist item fails.");
  }
  if (!input.description?.trim()) {
    throw new QcError("Description is required when any checklist item fails.");
  }
  if (!input.failedCriteria?.length) {
    throw new QcError("At least one failed criterion must be listed.");
  }
  if (!input.sentToStage) {
    throw new QcError("Send-back stage is required when any checklist item fails.");
  }
  if (!isStageBefore(input.sentToStage, "Quality Check")) {
    throw new QcError("Can only send back to an earlier stage in the production flow.");
  }

  const ncrNo = await generateNcrNo(organizationId);

  const created = await prisma.$transaction(async (tx) => {
    const qcRecord = await tx.productionRunQcRecord.create({
      data: {
        productionRunId,
        productionRunItemId,
        result: "Fail",
        checklistResults: input.checklistResults,
        inspectedByName: input.inspectedByName.trim(),
        photoUrls: input.photoUrls ?? [],
      },
    });

    await tx.nonConformanceReport.create({
      data: {
        qcRecordId: qcRecord.id,
        ncrNo,
        severity: input.severity!,
        failedCriteria: input.failedCriteria!,
        description: input.description!.trim(),
        sentToStage: toDbProductionRunStage(input.sentToStage!),
        createdByName: actor.name,
      },
    });

    return tx.productionRunQcRecord.findUniqueOrThrow({
      where: { id: qcRecord.id },
      include: { ncr: true },
    });
  });

  await rejectProductionRunStage(
    productionRunId,
    "Quality Check",
    {
      rejectedToStage: input.sentToStage,
      reason: input.description.trim(),
      karigarName: input.inspectedByName.trim(),
    },
    actor,
    organizationId,
  );

  return {
    qcRecord: toQcRecord(created),
    warning,
    rejectedToStage: input.sentToStage,
  };
};
