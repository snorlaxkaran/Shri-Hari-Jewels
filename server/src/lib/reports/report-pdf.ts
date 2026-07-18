import PDFDocument from "pdfkit";
import type { ShopSettings } from "../../types.js";
import { drawDocumentHeader } from "../pdf/document-header.js";
import {
  drawBorderedTable,
  ensureSpace,
  getContentWidth,
  type TableRow,
} from "../pdf/table.js";

export type ReportPdfColumn = {
  header: string;
  align?: "left" | "center" | "right";
};

export type ReportPdfFilters = Record<string, string | undefined>;

export const generateReportPdf = (
  title: string,
  columns: ReportPdfColumn[],
  rows: string[][],
  filters: ReportPdfFilters,
  settings: ShopSettings,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const contentWidth = getContentWidth(doc);

    drawDocumentHeader(doc, settings, title.toUpperCase());

    const filterLines = Object.entries(filters)
      .filter(([, value]) => value && value.trim().length > 0)
      .map(([key, value]) => `${formatFilterLabel(key)}: ${value}`);

    if (filterLines.length > 0) {
      doc.font("Helvetica").fontSize(9).fillColor("#374151");
      doc.text(filterLines.join("  |  "), left, doc.y, { width: contentWidth });
      doc.moveDown(0.5);
    }

    doc.font("Helvetica").fontSize(8).fillColor("#6b7280");
    doc.text(
      `Generated on ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
      left,
      doc.y,
      {
      width: contentWidth,
    });
    doc.moveDown(0.75);

    const columnCount = columns.length;
    const columnWidths = columns.map((_, index) => {
      if (index === 0) return contentWidth * 0.28;
      if (columnCount <= 3) return (contentWidth * 0.72) / (columnCount - 1);
      return contentWidth / columnCount;
    });

    const tableRows: TableRow[] = [
      {
        cells: columns.map((c) => c.header),
        bold: true,
        alignments: columns.map((c) => c.align ?? "left"),
      },
      ...rows.map((row) => ({
        cells: row,
        alignments: columns.map((c) => c.align ?? "left"),
      })),
    ];

    ensureSpace(doc, 40);
    drawBorderedTable(doc, left, doc.y, columnWidths, tableRows, {
      headerRowCount: 1,
      defaultFontSize: 8,
      headerFontSize: 8,
    });

    doc.end();
  });

const formatFilterLabel = (key: string): string =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/Id$/, "")
    .trim();
