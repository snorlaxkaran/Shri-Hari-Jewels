import PDFDocument from "pdfkit";
import type {
  ProductionRun,
  ProductionRunItem,
  ProductionRunStage,
  ShopSettings,
} from "../../types.js";
import { formatStructuredAddress } from "../validation/india.js";
import { STAGE_WORKSHEET_CONFIG } from "./stage-config.js";
import { PRODUCTION_RUN_STAGES } from "./stages.js";

const DASH = "-";

const formatDate = (value?: string | null): string => {
  if (!value) return DASH;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return DASH;
  return parsed.toLocaleDateString("en-IN");
};

const formatShopAddress = (settings: ShopSettings): string | null =>
  formatStructuredAddress({
    line1: settings.addressLine1,
    line2: settings.addressLine2,
    city: settings.city,
    state: settings.state,
    pincode: settings.pincode,
    country: settings.country,
  }) ?? settings.address;

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

const renderItemBlock = (
  doc: PDFKit.PDFDocument,
  item: ProductionRunItem,
  index: number,
) => {
  doc.fontSize(10).fillColor("#000").text(`${index + 1}. ${item.elementName}`, {
    continued: false,
  });
  doc.fontSize(8).fillColor("#444");
  doc.text(
    [
      `Type: ${item.elementType}`,
      `Qty/set: ${cell(item.qtyPerSet)}`,
      `Total: ${cell(item.totalQty)}`,
      item.weightGramsPerPc != null ? `Weight: ${item.weightGramsPerPc}g/pc` : null,
    ]
      .filter(Boolean)
      .join("  |  "),
  );

  const lines = [
    `Wax moulds: ${cell(item.waxCount)}`,
    `Production date: ${formatDate(item.productionDate)}`,
    `Casting received: ${cell(item.castingReceived)}`,
    `Metal weight (g): ${cell(item.metalWeightGrams)}`,
    `CZ stones: ${cell(item.czStones)}`,
    `CZ weight (ct): ${cell(item.czWeight)}`,
    `Stone order date: ${formatDate(item.stoneOrderDate)}`,
    `Stone delivery date: ${formatDate(item.stoneDeliveryDate)}`,
    `Sign / received by: ${cell(item.stoneSignOff)}`,
  ];

  for (const line of lines) {
    doc.text(`  ${line}`);
  }

  doc.moveDown(0.35);
};

export const generateProductionRunStagePdf = ({
  run,
  stage,
  settings,
}: StagePdfInput): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const stageIndex = PRODUCTION_RUN_STAGES.indexOf(stage);

    doc.fontSize(18).fillColor("#000").text(settings.businessName, { align: "center" });
    const shopAddress = formatShopAddress(settings);
    if (shopAddress) {
      doc.fontSize(9).fillColor("#666").text(shopAddress, { align: "center" });
    }
    if (settings.phone) {
      doc.text(settings.phone, { align: "center" });
    }

    doc.moveDown(0.5);
    doc.fillColor("#000").fontSize(14).text("PRODUCTION ORDER WORKSHEET", {
      align: "center",
    });
    doc.moveDown(0.75);

    doc.fontSize(10).fillColor("#000");
    doc.text(`Run No: ${run.runNo}`);
    doc.text(`Stage: ${stage}`);
    doc.text(
      `Design: ${run.designCode}${run.designName ? ` - ${run.designName}` : ""}`,
    );
    doc.text(`Date: ${formatDate(new Date().toISOString())}`);
    doc.text(`Sets Ordered: ${run.setsOrdered}`);
    doc.text(
      `Metal: ${run.designMetal ?? DASH} ${run.designPurity ?? ""}`.trim(),
    );
    doc.text(`Status: ${run.status}`);
    if (stageIndex >= 0 && stageIndex < PRODUCTION_RUN_STAGES.length - 1) {
      doc.text(`Next Step: ${PRODUCTION_RUN_STAGES[stageIndex + 1]}`);
    }

    doc.moveDown(0.5);
    doc.fontSize(9).fillColor("#333");
    doc.text(STAGE_WORKSHEET_CONFIG[stage].instructions);
    doc.moveDown(0.75);

    doc.fontSize(11).fillColor("#000").text("Elements");
    doc.moveDown(0.25);

    run.items.forEach((item, index) => {
      if (doc.y > 700) {
        doc.addPage();
      }
      renderItemBlock(doc, item, index);
    });

    const stoneItems = run.items.filter(
      (item) => item.elementType === "Stone" || item.elementType === "Motif",
    );
    if (stoneItems.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor("#000").text("Stone Requirements (from design BOM)");
      doc.moveDown(0.25);
      doc.fontSize(9);
      for (const item of stoneItems) {
        doc.text(
          `- ${item.elementName}: ${cell(item.czStones)} stones, ${cell(item.czWeight)} ct total`,
        );
      }
    }

    doc.moveDown(0.75);
    doc.fontSize(11).fillColor("#000").text("Stage Progress");
    doc.moveDown(0.25);
    doc.fontSize(9);
    for (const stageName of PRODUCTION_RUN_STAGES) {
      const log = run.stageLogs.find((entry) => entry.stage === stageName);
      const checkoffDone = run.items.every((item) => {
        const config = STAGE_WORKSHEET_CONFIG[stageName];
        if (config.mode !== "checkoff" || !config.checkoffStage) return true;
        return parseCheckoffs(item)[config.checkoffStage];
      });
      const marker = log
        ? `[Done] ${formatDate(log.createdAt)} - ${log.performedByName}`
        : checkoffDone
          ? "[Done]"
          : stageName === stage
            ? "[Current]"
            : DASH;
      doc.text(`${stageName}: ${marker}`);
    }

    const notes = run.stageLogs.filter((log) => log.notes?.trim());
    if (notes.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor("#000").text("Stage Notes");
      doc.moveDown(0.25);
      doc.fontSize(9);
      for (const log of notes) {
        doc.text(`${log.stage} (${log.performedByName}): ${log.notes}`);
      }
    }

    doc.moveDown(1);
    doc.fontSize(8).fillColor("#666");
    doc.text(
      "This worksheet includes all data entered in prior production steps. Sign-off fields may be filled manually on printouts.",
      { align: "center" },
    );

    doc.end();
  });
