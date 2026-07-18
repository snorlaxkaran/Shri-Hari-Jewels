import type PDFDocument from "pdfkit";

export type TableCellAlign = "left" | "center" | "right";

export type TableRow = {
  cells: string[];
  bold?: boolean;
  fontSize?: number;
  alignments?: readonly TableCellAlign[];
  minHeight?: number;
};

export type BorderedTableOptions = {
  headerRowCount?: number;
  defaultRowHeight?: number;
  defaultFontSize?: number;
  headerFontSize?: number;
  headerFill?: string;
  strokeColor?: string;
  lineWidth?: number;
};

const DEFAULT_OPTIONS: Required<BorderedTableOptions> = {
  headerRowCount: 0,
  defaultRowHeight: 22,
  defaultFontSize: 9,
  headerFontSize: 9,
  headerFill: "#f3f4f6",
  strokeColor: "#000000",
  lineWidth: 0.75,
};

export const getContentWidth = (doc: PDFKit.PDFDocument): number =>
  doc.page.width - doc.page.margins.left - doc.page.margins.right;

export const ensureSpace = (
  doc: PDFKit.PDFDocument,
  neededHeight: number,
): void => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + neededHeight > bottom) {
    doc.addPage();
  }
};

const pageBottom = (doc: PDFKit.PDFDocument): number =>
  doc.page.height - doc.page.margins.bottom;

const computeRowHeight = (
  doc: PDFKit.PDFDocument,
  row: TableRow,
  columnWidths: number[],
  opts: Required<BorderedTableOptions>,
  isHeader: boolean,
): number => {
  const fontSize = row.fontSize ?? (isHeader ? opts.headerFontSize : opts.defaultFontSize);
  const minHeight = row.minHeight ?? opts.defaultRowHeight;

  doc.fontSize(fontSize);
  doc.font(row.bold || isHeader ? "Helvetica-Bold" : "Helvetica");

  let rowHeight = minHeight;
  for (let col = 0; col < row.cells.length; col += 1) {
    const padding = 8;
    const textHeight = doc.heightOfString(row.cells[col] ?? "", {
      width: columnWidths[col] - padding,
      align: row.alignments?.[col] ?? "left",
    });
    rowHeight = Math.max(rowHeight, textHeight + 8);
  }

  return rowHeight;
};

const drawTableRow = (
  doc: PDFKit.PDFDocument,
  startX: number,
  y: number,
  columnWidths: number[],
  row: TableRow,
  opts: Required<BorderedTableOptions>,
  isHeader: boolean,
  tableWidth: number,
): number => {
  const fontSize = row.fontSize ?? (isHeader ? opts.headerFontSize : opts.defaultFontSize);
  const rowHeight = computeRowHeight(doc, row, columnWidths, opts, isHeader);

  doc.fontSize(fontSize);
  doc.font(row.bold || isHeader ? "Helvetica-Bold" : "Helvetica");

  if (isHeader) {
    doc
      .rect(startX, y, tableWidth, rowHeight)
      .fillAndStroke(opts.headerFill, opts.strokeColor);
    doc.fillColor("#000000");
  }

  let x = startX;
  for (let col = 0; col < row.cells.length; col += 1) {
    doc.rect(x, y, columnWidths[col], rowHeight).stroke();

    const align = row.alignments?.[col] ?? (col === 0 ? "left" : "center");
    doc.font(row.bold || isHeader ? "Helvetica-Bold" : "Helvetica");
    doc.fontSize(fontSize);
    doc.fillColor("#000000");
    doc.text(row.cells[col] ?? "", x + 4, y + 4, {
      width: columnWidths[col] - 8,
      align,
      lineBreak: true,
    });

    x += columnWidths[col];
  }

  return y + rowHeight;
};

export const drawBorderedTable = (
  doc: PDFKit.PDFDocument,
  startX: number,
  startY: number,
  columnWidths: number[],
  rows: TableRow[],
  options?: BorderedTableOptions,
): number => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const headerRows = rows.slice(0, opts.headerRowCount);

  doc.save();
  doc.lineWidth(opts.lineWidth).strokeColor(opts.strokeColor);

  let y = startY;

  const redrawHeaders = (): void => {
    for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex += 1) {
      y = drawTableRow(
        doc,
        startX,
        y,
        columnWidths,
        headerRows[rowIndex],
        opts,
        true,
        tableWidth,
      );
    }
  };

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const isHeader = rowIndex < opts.headerRowCount;
    const rowHeight = computeRowHeight(doc, row, columnWidths, opts, isHeader);

    if (y + rowHeight > pageBottom(doc)) {
      doc.addPage();
      y = doc.page.margins.top;
      if (!isHeader && headerRows.length > 0) {
        redrawHeaders();
      }
    }

    y = drawTableRow(
      doc,
      startX,
      y,
      columnWidths,
      row,
      opts,
      isHeader,
      tableWidth,
    );
  }

  doc.restore();
  return y;
};

export const drawLabelValueBox = (
  doc: PDFKit.PDFDocument,
  startX: number,
  startY: number,
  width: number,
  title: string,
  lines: string[],
  options?: { titleFontSize?: number; lineFontSize?: number },
): number => {
  const titleFontSize = options?.titleFontSize ?? 10;
  const lineFontSize = options?.lineFontSize ?? 9;
  const padding = 8;
  const lineGap = 2;

  doc.font("Helvetica-Bold").fontSize(titleFontSize);
  const titleHeight = doc.heightOfString(title, { width: width - padding * 2 });
  doc.font("Helvetica").fontSize(lineFontSize);

  let contentHeight = titleHeight + lineGap;
  for (const line of lines) {
    contentHeight +=
      doc.heightOfString(line, { width: width - padding * 2 }) + lineGap;
  }

  const boxHeight = contentHeight + padding * 2;

  doc.save();
  doc.lineWidth(0.75).strokeColor("#000000");
  doc.rect(startX, startY, width, boxHeight).stroke();
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(titleFontSize).fillColor("#000000");
  doc.text(title, startX + padding, startY + padding, {
    width: width - padding * 2,
  });

  let textY = startY + padding + titleHeight + lineGap;
  doc.font("Helvetica").fontSize(lineFontSize);
  for (const line of lines) {
    doc.text(line, startX + padding, textY, { width: width - padding * 2 });
    textY += doc.heightOfString(line, { width: width - padding * 2 }) + lineGap;
  }

  return startY + boxHeight;
};
