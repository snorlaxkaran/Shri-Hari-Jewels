import * as XLSX from "xlsx";
import type { ProductionRun, ProductionRunItem, ProductionRunStage } from "@/lib/types";
import { getStageItems } from "./item-helpers";
import { getStageWorksheetConfig } from "./stage-config";
import { PRODUCTION_RUN_STEPS } from "./stages";

const csvCell = (value: string | number | boolean | null | undefined) => {
  const text = value == null || value === "" ? "" : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

const formatDateForFilename = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const getNextStageLabel = (stage: ProductionRunStage): string | undefined => {
  const idx = PRODUCTION_RUN_STEPS.findIndex((step) => step.stage === stage);
  if (idx < 0 || idx >= PRODUCTION_RUN_STEPS.length - 1) return undefined;
  return PRODUCTION_RUN_STEPS[idx + 1].label;
};

type WorksheetRow = Record<string, string | number | boolean>;

const buildWorksheetRows = (
  run: ProductionRun,
  stage: ProductionRunStage,
): WorksheetRow[] => {
  const config = getStageWorksheetConfig(stage);
  const items = getStageItems(run, stage);
  const nextStage = getNextStageLabel(stage);

  return items.map((item, index) => {
    const base: WorksheetRow = {
      "#": index + 1,
      Element: item.elementName,
      Type: item.elementType,
      "Qty / Set": item.qtyPerSet,
      "Total Qty": item.totalQty,
      "Weight (g/pc)": item.weightGramsPerPc ?? "",
      "Wax Moulds": item.waxCount ?? "",
      "Production Date": item.productionDate
        ? new Date(item.productionDate).toLocaleDateString("en-IN")
        : "",
      "Metal Weight (g)": item.metalWeightGrams ?? "",
      "Casting Received": item.castingReceived ? "Yes" : "No",
      "CZ Stones": item.czStones ?? "",
      "CZ Weight (ct)": item.czWeight ?? "",
      "Stone Order Date": item.stoneOrderDate
        ? new Date(item.stoneOrderDate).toLocaleDateString("en-IN")
        : "",
      "Stone Delivery Date": item.stoneDeliveryDate
        ? new Date(item.stoneDeliveryDate).toLocaleDateString("en-IN")
        : "",
      "Stone Sign-off": item.stoneSignOff ?? "",
      "Has Motif Image": item.imageUrl ? "Yes" : "No",
      "Image File": item.imageUrl ? `motif-${index + 1}-${slugify(item.elementName)}.png` : "",
    };

    if (config.mode === "checkoff" && config.checkoffStage) {
      base[`${stage} Complete`] = item.stageCheckoffs?.[config.checkoffStage]
        ? "Yes"
        : "No";
    }

    if (nextStage) {
      base["Next Step"] = nextStage;
    }

    return base;
  });
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const buildFilename = (run: ProductionRun, stage: ProductionRunStage, ext: string) =>
  `${run.runNo}-${slugify(stage)}-${formatDateForFilename()}.${ext}`;

export const downloadStageCsv = (run: ProductionRun, stage: ProductionRunStage) => {
  const rows = buildWorksheetRows(run, stage);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : ["Element"];
  const meta = [
    `# Production Run: ${run.runNo}`,
    `# Design: ${run.designCode}${run.designName ? ` — ${run.designName}` : ""}`,
    `# Stage: ${stage}`,
    `# Sets: ${run.setsOrdered}`,
    `# Metal: ${run.designMetal ?? "—"} ${run.designPurity ?? ""}`.trim(),
    `# ${getStageWorksheetConfig(stage).exportHint}`,
    "",
  ];
  const body = [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(",")),
  ];
  const csv = `\uFEFF${[...meta, ...body].join("\n")}`;
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), buildFilename(run, stage, "csv"));
};

export const downloadStageExcel = (run: ProductionRun, stage: ProductionRunStage) => {
  const rows = buildWorksheetRows(run, stage);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, stage.slice(0, 31));

  const summaryRows = [
    ["Production Run", run.runNo],
    ["Design", `${run.designCode}${run.designName ? ` — ${run.designName}` : ""}`],
    ["Stage", stage],
    ["Sets Ordered", run.setsOrdered],
    ["Metal / Purity", `${run.designMetal ?? "—"} ${run.designPurity ?? ""}`.trim()],
    ["Instructions", getStageWorksheetConfig(stage).instructions],
    ["Next Step", getNextStageLabel(stage) ?? "Complete run"],
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(summaryRows),
    "Summary",
  );

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    buildFilename(run, stage, "xlsx"),
  );
};

const renderDesignPhotos = (run: ProductionRun): string => {
  const photos = run.designPhotos;
  if (!photos) return "";

  const blocks: string[] = [];
  if (photos.cadFileUrl) {
    blocks.push(
      `<figure><img src="${photos.cadFileUrl}" alt="CAD reference" /><figcaption>CAD Reference</figcaption></figure>`,
    );
  }
  if (photos.moldPhotoUrl) {
    blocks.push(
      `<figure><img src="${photos.moldPhotoUrl}" alt="Mold reference" /><figcaption>Mold Reference</figcaption></figure>`,
    );
  }
  for (const [index, url] of (photos.finishedPhotoUrls ?? []).entries()) {
    blocks.push(
      `<figure><img src="${url}" alt="Finished reference ${index + 1}" /><figcaption>Finished Reference ${index + 1}</figcaption></figure>`,
    );
  }
  if (photos.finishedPhotoUrl) {
    blocks.push(
      `<figure><img src="${photos.finishedPhotoUrl}" alt="Finished reference" /><figcaption>Finished Reference</figcaption></figure>`,
    );
  }

  if (blocks.length === 0) return "";
  return `<section class="design-refs"><h2>Design References</h2><div class="photo-grid">${blocks.join("")}</div></section>`;
};

const renderItemCard = (
  item: ProductionRunItem,
  index: number,
  stage: ProductionRunStage,
): string => {
  const config = getStageWorksheetConfig(stage);
  const imageBlock = item.imageUrl
    ? `<img src="${item.imageUrl}" alt="${item.elementName}" class="motif-image" />`
    : `<div class="no-image">No motif image</div>`;

  const details: Array<[string, string]> = [
    ["Type", item.elementType],
    ["Qty / Set", String(item.qtyPerSet)],
    ["Total Qty", String(item.totalQty)],
    ["Weight", item.weightGramsPerPc ? `${item.weightGramsPerPc} g/pc` : "—"],
  ];

  if (config.mode === "wax") {
    details.push(["Wax Moulds", item.waxCount != null ? String(item.waxCount) : ""]);
  }
  if (config.mode === "casting") {
    details.push(["Metal Weight (g)", item.metalWeightGrams != null ? String(item.metalWeightGrams) : ""]);
    details.push(["Casting Received", item.castingReceived ? "Yes" : "No"]);
  }
  if (config.mode === "stone-setting") {
    details.push(["CZ Stones", item.czStones != null ? String(item.czStones) : ""]);
    details.push(["CZ Weight (ct)", item.czWeight != null ? String(item.czWeight) : ""]);
  }
  if (config.mode === "checkoff" && config.checkoffStage) {
    details.push([
      `${stage} Complete`,
      item.stageCheckoffs?.[config.checkoffStage] ? "Yes" : "No",
    ]);
  }

  return `
    <article class="item-card">
      <div class="item-head">
        <h3>${index + 1}. ${item.elementName}</h3>
        <span class="badge">${item.elementType}</span>
      </div>
      <div class="item-body">
        <div class="image-wrap">${imageBlock}</div>
        <table>
          ${details.map(([label, value]) => `<tr><th>${label}</th><td>${value || "—"}</td></tr>`).join("")}
        </table>
      </div>
    </article>
  `;
};

export const downloadStagePrintPack = (
  run: ProductionRun,
  stage: ProductionRunStage,
) => {
  const items = getStageItems(run, stage);
  const config = getStageWorksheetConfig(stage);
  const nextStage = getNextStageLabel(stage);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${run.runNo} — ${stage}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #18181b; margin: 24px; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    .meta { color: #52525b; margin-bottom: 24px; line-height: 1.6; }
    .instructions { background: #fafafa; border: 1px solid #e4e4e7; padding: 16px; border-radius: 12px; margin-bottom: 24px; }
    .design-refs, .items { margin-bottom: 32px; }
    .photo-grid, .items { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    .item-card, figure { border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; background: #fff; }
    .item-head { display: flex; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f4f4f5; }
    .item-head h3 { margin: 0; font-size: 16px; }
    .badge { background: #f4f4f5; color: #52525b; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
    .item-body { padding: 16px; }
    .image-wrap, figure { margin-bottom: 12px; }
    .motif-image, figure img { width: 100%; max-height: 220px; object-fit: contain; background: #fafafa; display: block; }
    .no-image { height: 180px; display: grid; place-items: center; background: #fafafa; color: #a1a1aa; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 6px 0; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
    th { width: 42%; color: #71717a; font-weight: 600; }
    figcaption { padding: 8px 12px; font-size: 12px; color: #52525b; }
    @media print { body { margin: 12mm; } .item-card { break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>${run.runNo} — ${stage}</h1>
  <div class="meta">
    <div><strong>Design:</strong> ${run.designCode}${run.designName ? ` — ${run.designName}` : ""}</div>
    <div><strong>Sets:</strong> ${run.setsOrdered}</div>
    <div><strong>Metal:</strong> ${run.designMetal ?? "—"} ${run.designPurity ?? ""}</div>
    ${nextStage ? `<div><strong>Next step:</strong> ${nextStage}</div>` : ""}
  </div>
  <div class="instructions">${config.instructions}</div>
  ${renderDesignPhotos(run)}
  <section class="items-section">
    <h2>Elements (${items.length})</h2>
    <div class="items">
      ${items.map((item, index) => renderItemCard(item, index, stage)).join("")}
    </div>
  </section>
</body>
</html>`;

  downloadBlob(
    new Blob([html], { type: "text/html;charset=utf-8" }),
    buildFilename(run, stage, "html"),
  );
};

export const downloadStageImageFolderCsv = (
  run: ProductionRun,
  stage: ProductionRunStage,
) => {
  const items = getStageItems(run, stage).filter((item) => item.imageUrl);
  const rows = items.map((item, index) => ({
    Element: item.elementName,
    Type: item.elementType,
    "Suggested Filename": `motif-${index + 1}-${slugify(item.elementName)}.png`,
    "Image Data URL": item.imageUrl ?? "",
  }));

  const headers = ["Element", "Type", "Suggested Filename", "Image Data URL"];
  const csv = `\uFEFF${[
    `# Embedded motif images for ${run.runNo} — ${stage}`,
    `# Open in Excel or import Image Data URL into your tooling`,
    "",
    headers.join(","),
    ...rows.map((row) => headers.map((key) => csvCell(row[key as keyof typeof row])).join(",")),
  ].join("\n")}`;

  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    buildFilename(run, stage, "images.csv"),
  );
};
