import type PDFKit from "pdfkit";
import type { ProductionRun, ProductionRunStage } from "../../types.js";
import { formatDateIn } from "./format.js";
import { drawBorderedTable, ensureSpace, getContentWidth } from "./table.js";

export const PRODUCTION_PROCESS_LEFT = [
  "Stone order:-",
  "Chain & othermetal:-",
  "Cad:-",
  "Wax:-",
  "Master:-",
  "Casting:-",
  "Ghat:-",
] as const;

export const PRODUCTION_PROCESS_RIGHT = [
  "Engraving:-",
  "Enameling:-",
  "Tumbling & polishing:-",
  "Plating:-",
  "Setting/Kundan jadau:-",
  "other work:-",
  "Beading work:-",
] as const;

const PROCESS_HEADERS = [
  "Process",
  "Order date",
  "Compilation date",
  "Designer's Sign",
] as const;

type ProcessPrefill = {
  orderDate?: string;
  compilationDate?: string;
  sign?: string;
};

const STAGE_TO_PROCESS: Partial<Record<ProductionRunStage, string>> = {
  "Wax Pattern": "Wax:-",
  Casting: "Casting:-",
  Prepolish: "Tumbling & polishing:-",
  "Stone Setting": "Setting/Kundan jadau:-",
  "Final Polishing": "Tumbling & polishing:-",
  Plating: "Plating:-",
};

const buildPrefillMap = (run?: ProductionRun): Map<string, ProcessPrefill> => {
  const map = new Map<string, ProcessPrefill>();
  if (!run) return map;

  const stoneOrderDates = run.items
    .map((item) => item.stoneOrderDate)
    .filter(Boolean) as string[];
  if (stoneOrderDates.length > 0) {
    const earliest = stoneOrderDates.sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    )[0];
    map.set("Stone order:-", { orderDate: formatDateIn(earliest) });
  }

  const stoneDeliveryDates = run.items
    .map((item) => item.stoneDeliveryDate)
    .filter(Boolean) as string[];
  if (stoneDeliveryDates.length > 0) {
    const latest = stoneDeliveryDates.sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    )[0];
    const existing = map.get("Stone order:-") ?? {};
    map.set("Stone order:-", {
      ...existing,
      compilationDate: formatDateIn(latest),
      sign: run.items.find((item) => item.stoneSignOff)?.stoneSignOff,
    });
  }

  for (const log of run.stageLogs) {
    const processLabel = STAGE_TO_PROCESS[log.stage];
    if (!processLabel) continue;
    const existing = map.get(processLabel) ?? {};
    map.set(processLabel, {
      ...existing,
      compilationDate: formatDateIn(log.createdAt),
      sign: log.performedByName || existing.sign,
    });
  }

  return map;
};

export const drawProductionProcessTrackingSheet = (
  doc: PDFKit.PDFDocument,
  run?: ProductionRun,
  startY?: number,
): number => {
  const left = doc.page.margins.left;
  const contentWidth = getContentWidth(doc);
  const y = startY ?? doc.y;

  const rowCount = Math.max(
    PRODUCTION_PROCESS_LEFT.length,
    PRODUCTION_PROCESS_RIGHT.length,
  );
  const estimatedHeight = 24 + rowCount * 22 + 16;
  ensureSpace(doc, estimatedHeight);

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
  doc.text("Production Process Tracking", left, y);
  const tableTop = doc.y + 6;

  const halfWidth = contentWidth / 2;
  const processWidth = halfWidth * 0.34;
  const dateWidth = halfWidth * 0.22;
  const signWidth = halfWidth * 0.22;
  const columnWidths = [
    processWidth,
    dateWidth,
    dateWidth,
    signWidth,
    processWidth,
    dateWidth,
    dateWidth,
    signWidth,
  ];

  const prefill = buildPrefillMap(run);

  const headerRow = {
    cells: [...PROCESS_HEADERS, ...PROCESS_HEADERS],
    bold: true,
    alignments: [
      "left",
      "center",
      "center",
      "center",
      "left",
      "center",
      "center",
      "center",
    ] as const,
    minHeight: 24,
  };

  const dataRows = Array.from({ length: rowCount }, (_, index) => {
    const leftLabel = PRODUCTION_PROCESS_LEFT[index] ?? "";
    const rightLabel = PRODUCTION_PROCESS_RIGHT[index] ?? "";
    const leftData = prefill.get(leftLabel) ?? {};
    const rightData = prefill.get(rightLabel) ?? {};

    return {
      cells: [
        leftLabel,
        leftData.orderDate ?? "",
        leftData.compilationDate ?? "",
        leftData.sign ?? "",
        rightLabel,
        rightData.orderDate ?? "",
        rightData.compilationDate ?? "",
        rightData.sign ?? "",
      ],
      alignments: [
        "left",
        "center",
        "center",
        "center",
        "left",
        "center",
        "center",
        "center",
      ] as const,
      minHeight: 22,
    };
  });

  const bottomY = drawBorderedTable(doc, left, tableTop, columnWidths, [
    headerRow,
    ...dataRows,
  ], {
    headerRowCount: 1,
    defaultFontSize: 8.5,
    headerFontSize: 8.5,
    defaultRowHeight: 22,
  });

  doc.y = bottomY + 14;
  return doc.y;
};
