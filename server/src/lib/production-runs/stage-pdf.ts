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

const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN");
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
  if (value == null || value === "") return "—";
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

    const stageIndex = PRODUCTION_RUN_STAGES.indexOf(stage);
    const completedStages = new Set(run.stageLogs.map((log) => log.stage));

    doc.fontSize(18).text(settings.businessName, { align: "center" });
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

    doc.fontSize(10);
    const leftX = 40;
    const rightX = 300;
    let y = doc.y;
    doc.text(`Run No: ${run.runNo}`, leftX, y);
    doc.text(`Stage: ${stage}`, rightX, y);
    y += 14;
    doc.text(
      `Design: ${run.designCode}${run.designName ? ` — ${run.designName}` : ""}`,
      leftX,
      y,
    );
    doc.text(`Date: ${formatDate(new Date().toISOString())}`, rightX, y);
    y += 14;
    doc.text(`Sets Ordered: ${run.setsOrdered}`, leftX, y);
    doc.text(
      `Metal: ${run.designMetal ?? "—"} ${run.designPurity ?? ""}`.trim(),
      rightX,
      y,
    );
    y += 14;
    doc.text(`Status: ${run.status}`, leftX, y);
    if (stageIndex >= 0 && stageIndex < PRODUCTION_RUN_STAGES.length - 1) {
      doc.text(`Next Step: ${PRODUCTION_RUN_STAGES[stageIndex + 1]}`, rightX, y);
    }
    doc.y = y + 20;

    doc.fontSize(9).fillColor("#333");
    doc.text(STAGE_WORKSHEET_CONFIG[stage].instructions, { align: "left" });
    doc.moveDown(0.75);

    const tableTop = doc.y;
    const columns = [
      { label: "#", width: 18 },
      { label: "Element", width: 72 },
      { label: "Type", width: 42 },
      { label: "Qty/Set", width: 36 },
      { label: "Total", width: 32 },
      { label: "Wax", width: 28 },
      { label: "Prod Date", width: 52 },
      { label: "Cast Rcvd", width: 42 },
      { label: "Metal g", width: 38 },
      { label: "Stones", width: 36 },
      { label: "Carat", width: 36 },
      { label: "Ord Date", width: 52 },
      { label: "Del Date", width: 52 },
      { label: "Sign", width: 36 },
    ];

    let x = 40;
    doc.fontSize(7).fillColor("#000");
    for (const col of columns) {
      doc.text(col.label, x, tableTop, { width: col.width, lineBreak: false });
      x += col.width;
    }

    doc
      .moveTo(40, tableTop + 12)
      .lineTo(555, tableTop + 12)
      .strokeColor("#ccc")
      .stroke();

    let rowY = tableTop + 16;
    run.items.forEach((item, index) => {
      if (rowY > 720) {
        doc.addPage();
        rowY = 40;
      }

      x = 40;
      const row = [
        String(index + 1),
        item.elementName.slice(0, 18),
        item.elementType.slice(0, 8),
        cell(item.qtyPerSet),
        cell(item.totalQty),
        cell(item.waxCount),
        formatDate(item.productionDate),
        cell(item.castingReceived),
        cell(item.metalWeightGrams),
        cell(item.czStones),
        cell(item.czWeight),
        formatDate(item.stoneOrderDate),
        formatDate(item.stoneDeliveryDate),
        cell(item.stoneSignOff),
      ];

      doc.fontSize(7).fillColor("#222");
      columns.forEach((col, colIndex) => {
        doc.text(row[colIndex], x, rowY, { width: col.width, lineBreak: false });
        x += col.width;
      });
      rowY += 14;
    });

    doc.y = rowY + 10;

    const stoneItems = run.items.filter(
      (item) => item.elementType === "Stone" || item.elementType === "Motif",
    );
    if (stoneItems.length > 0) {
      doc.fontSize(11).fillColor("#000").text("Stone Requirements (from design BOM)", {
        underline: true,
      });
      doc.moveDown(0.25);
      doc.fontSize(9);
      for (const item of stoneItems) {
        doc.text(
          `• ${item.elementName}: ${item.czStones ?? "—"} stones, ${item.czWeight ?? "—"} ct total`,
        );
      }
      doc.moveDown(0.5);
    }

    doc.fontSize(11).fillColor("#000").text("Stage Progress", { underline: true });
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
        ? `✓ ${formatDate(log.createdAt)} — ${log.performedByName}`
        : completedStages.has(stageName) || checkoffDone
          ? "✓"
          : stageName === stage
            ? "→ Current"
            : "—";
      doc.text(`${stageName}: ${marker}`);
    }

    if (run.stageLogs.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).text("Stage Notes", { underline: true });
      doc.moveDown(0.25);
      doc.fontSize(9);
      for (const log of run.stageLogs) {
        if (log.notes) {
          doc.text(`${log.stage} (${log.performedByName}): ${log.notes}`);
        }
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
