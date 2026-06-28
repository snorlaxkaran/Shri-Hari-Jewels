import PDFDocument from "pdfkit";
import type {
  ProductionRun,
  ProductionRunItem,
  ProductionRunStage,
  ShopSettings,
} from "../../types.js";
import { drawDocumentHeader } from "../pdf/document-header.js";
import { formatDateIn } from "../pdf/format.js";
import { drawProductionProcessTrackingSheet } from "../pdf/process-tracking-sheet.js";
import {
  drawBorderedTable,
  drawLabelValueBox,
  ensureSpace,
  getContentWidth,
} from "../pdf/table.js";
import { STAGE_WORKSHEET_CONFIG } from "./stage-config.js";
import { PRODUCTION_RUN_STAGES } from "./stages.js";

const DASH = "-";

const cell = (value: string | number | boolean | null | undefined): string => {
  if (value == null || value === "") return DASH;
  if (typeof value === "number" && Number.isNaN(value)) return DASH;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

const parseCheckoffs = (
  item: ProductionRunItem,
): Partial<Record<ProductionRunStage, boolean>> => item.stageCheckoffs ?? {};

type StagePdfInput = {
  run: ProductionRun;
  stage: ProductionRunStage;
  settings: ShopSettings;
};

export const generateProductionRunStagePdf = ({
  run,
  stage,
  settings,
}: StagePdfInput): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const contentWidth = getContentWidth(doc);
    const stageIndex = PRODUCTION_RUN_STAGES.indexOf(stage);

    drawDocumentHeader(doc, settings, "PRODUCTION ORDER WORKSHEET");

    const metaTop = doc.y;
    const columnGap = 12;
    const leftColWidth = contentWidth * 0.58;
    const rightColWidth = contentWidth - leftColWidth - columnGap;

    const runMetaLines = [
      `Run No: ${run.runNo}`,
      `Design: ${run.designCode}${run.designName ? ` - ${run.designName}` : ""}`,
      `Category: ${run.designCategory ?? DASH}`,
      `Metal: ${run.designMetal ?? DASH} ${run.designPurity ?? ""}`.trim(),
      `Sets Ordered: ${run.setsOrdered}`,
      `Castings: ${run.castingsReceived}/${run.castingsTotal}`,
    ];

    const stageMetaLines = [
      `Current Stage: ${stage}`,
      `Run Status: ${run.status}`,
      `Worksheet Date: ${formatDateIn(new Date().toISOString())}`,
      stageIndex >= 0 && stageIndex < PRODUCTION_RUN_STAGES.length - 1
        ? `Next Step: ${PRODUCTION_RUN_STAGES[stageIndex + 1]}`
        : "Next Step: Complete run",
    ];

    const leftBottom = drawLabelValueBox(
      doc,
      left,
      metaTop,
      leftColWidth,
      "Production Run",
      runMetaLines,
    );
    const rightBottom = drawLabelValueBox(
      doc,
      left + leftColWidth + columnGap,
      metaTop,
      rightColWidth,
      "Stage Details",
      stageMetaLines,
    );

    doc.y = Math.max(leftBottom, rightBottom) + 12;
    drawProductionProcessTrackingSheet(doc, run);

    ensureSpace(doc, 60);
    doc.y =
      drawLabelValueBox(
        doc,
        left,
        doc.y,
        contentWidth,
        "Stage Instructions",
        [STAGE_WORKSHEET_CONFIG[stage].instructions],
      ) + 14;

    ensureSpace(doc, 80);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
    doc.text("Elements", left, doc.y);
    doc.y += 8;

    const elementTableTop = doc.y;
    const colNum = contentWidth * 0.05;
    const colElement = contentWidth * 0.2;
    const colType = contentWidth * 0.1;
    const colQtyPerSet = contentWidth * 0.08;
    const colTotal = contentWidth * 0.08;
    const colWax = contentWidth * 0.07;
    const colMetal = contentWidth * 0.09;
    const colStone = contentWidth * 0.11;
    const colDates =
      contentWidth -
      colNum -
      colElement -
      colType -
      colQtyPerSet -
      colTotal -
      colWax -
      colMetal -
      colStone;

    const elementRows = [
      {
        cells: [
          "#",
          "Element",
          "Type",
          "Qty/Set",
          "Total",
          "Wax",
          "Metal (g)",
          "Stones",
          "Stone Dates / Sign-off",
        ],
        bold: true,
        alignments: [
          "center",
          "left",
          "left",
          "center",
          "center",
          "center",
          "center",
          "center",
          "left",
        ] as const,
        minHeight: 24,
      },
      ...run.items.map((item, index) => ({
        cells: [
          String(index + 1),
          item.elementName,
          item.elementType,
          cell(item.qtyPerSet),
          cell(item.totalQty),
          cell(item.waxCount),
          cell(item.metalWeightGrams),
          `${cell(item.czStones)} / ${cell(item.czWeight)} ct`,
          [
            item.stoneOrderDate
              ? `Order: ${formatDateIn(item.stoneOrderDate)}`
              : null,
            item.stoneDeliveryDate
              ? `Delivery: ${formatDateIn(item.stoneDeliveryDate)}`
              : null,
            item.stoneSignOff ? `Sign: ${item.stoneSignOff}` : null,
            item.productionDate
              ? `Prod: ${formatDateIn(item.productionDate)}`
              : null,
          ]
            .filter(Boolean)
            .join("\n") || DASH,
        ],
        alignments: [
          "center",
          "left",
          "left",
          "center",
          "center",
          "center",
          "center",
          "center",
          "left",
        ] as const,
        minHeight: 28,
      })),
    ];

    doc.y = drawBorderedTable(
      doc,
      left,
      elementTableTop,
      [
        colNum,
        colElement,
        colType,
        colQtyPerSet,
        colTotal,
        colWax,
        colMetal,
        colStone,
        colDates,
      ],
      elementRows,
      { headerRowCount: 1, defaultFontSize: 8, headerFontSize: 8 },
    ) + 14;

    const stoneItems = run.items.filter(
      (item) => item.elementType === "Stone" || item.elementType === "Motif",
    );
    if (stoneItems.length > 0) {
      ensureSpace(doc, 80);
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
      doc.text("Stone Requirements (from design BOM)", left, doc.y);
      doc.y += 8;

      const stoneTableTop = doc.y;
      const stoneRows = [
        {
          cells: ["Element", "Stones", "Weight (ct)", "Order Date", "Delivery Date"],
          bold: true,
          alignments: ["left", "center", "center", "center", "center"] as const,
          minHeight: 22,
        },
        ...stoneItems.map((item) => ({
          cells: [
            item.elementName,
            cell(item.czStones),
            cell(item.czWeight),
            formatDateIn(item.stoneOrderDate) || DASH,
            formatDateIn(item.stoneDeliveryDate) || DASH,
          ],
          alignments: ["left", "center", "center", "center", "center"] as const,
        })),
      ];

      doc.y =
        drawBorderedTable(
          doc,
          left,
          stoneTableTop,
          [
            contentWidth * 0.34,
            contentWidth * 0.14,
            contentWidth * 0.16,
            contentWidth * 0.18,
            contentWidth * 0.18,
          ],
          stoneRows,
          { headerRowCount: 1, defaultFontSize: 8, headerFontSize: 8 },
        ) + 14;
    }

    ensureSpace(doc, 120);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
    doc.text("Stage Progress", left, doc.y);
    doc.y += 8;

    const progressRows = [
      {
        cells: ["Stage", "Status", "Completed On", "Completed By", "Notes"],
        bold: true,
        alignments: ["left", "center", "center", "left", "left"] as const,
        minHeight: 22,
      },
      ...PRODUCTION_RUN_STAGES.map((stageName) => {
        const log = run.stageLogs.find((entry) => entry.stage === stageName);
        const checkoffDone = run.items.every((item) => {
          const config = STAGE_WORKSHEET_CONFIG[stageName];
          if (config.mode !== "checkoff" || !config.checkoffStage) return true;
          return parseCheckoffs(item)[config.checkoffStage];
        });

        let status = DASH;
        if (log) status = "Done";
        else if (checkoffDone) status = "Done";
        else if (stageName === stage) status = "Current";

        return {
          cells: [
            stageName,
            status,
            log ? formatDateIn(log.createdAt) : DASH,
            log?.performedByName ?? DASH,
            log?.notes?.trim() ?? DASH,
          ],
          alignments: ["left", "center", "center", "left", "left"] as const,
          minHeight: 22,
        };
      }),
    ];

    doc.y = drawBorderedTable(
      doc,
      left,
      doc.y,
      [
        contentWidth * 0.22,
        contentWidth * 0.12,
        contentWidth * 0.16,
        contentWidth * 0.18,
        contentWidth * 0.32,
      ],
      progressRows,
      { headerRowCount: 1, defaultFontSize: 8, headerFontSize: 8 },
    ) + 16;

    ensureSpace(doc, 30);
    doc.font("Helvetica").fontSize(8).fillColor("#6b7280");
    doc.text(
      "This worksheet includes all data entered in prior production steps. Sign-off fields may be filled manually on printouts.",
      left,
      doc.y,
      { width: contentWidth, align: "center" },
    );

    doc.end();
  });
