import PDFDocument from "pdfkit";
import type { Employee as DbEmployee } from "@prisma/client";
import type { PayslipItem, ShopSettings } from "../../types.js";
import { drawDocumentHeader } from "../pdf/document-header.js";
import {
  drawBorderedTable,
  ensureSpace,
  getContentWidth,
  type TableRow,
} from "../pdf/table.js";
import {
  amountInIndianWords,
  formatPdfAmount,
  formatDateIn,
} from "../pdf/format.js";

export type PayslipPdfInput = {
  settings: ShopSettings;
  employee: DbEmployee;
  payslip: PayslipItem;
  periodLabel: string;
  runStatus: string;
};

export const generatePayslipPdf = (input: PayslipPdfInput): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { settings, employee, payslip, periodLabel } = input;
    const left = doc.page.margins.left;
    const contentWidth = getContentWidth(doc);

    drawDocumentHeader(doc, settings, "PAYSLIP", {
      subtitle: `Salary for ${periodLabel}`,
    });

    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
    doc.text("Employee Details", left, doc.y);
    doc.moveDown(0.25);

    const detailRows: [string, string][] = [
      ["Name", employee.name],
      ["Designation", employee.designation],
      ["Date of Joining", formatDateIn(employee.dateOfJoining.toISOString())],
      [
        "Days Present",
        `${payslip.daysPresent} / ${payslip.daysInMonth}`,
      ],
      ["Loss of Pay Days", String(payslip.lossOfPayDays)],
    ];

    doc.font("Helvetica").fontSize(9).fillColor("#374151");
    for (const [label, value] of detailRows) {
      doc.text(`${label}: `, left, doc.y, { continued: true, width: contentWidth });
      doc.font("Helvetica-Bold").text(value, { width: contentWidth });
      doc.font("Helvetica");
    }

    doc.moveDown(0.75);

    const halfWidth = contentWidth / 2 - 8;
    const earningsRows: TableRow[] = [
      {
        cells: ["Earnings", "Amount (INR)"],
        bold: true,
        alignments: ["left", "right"],
      },
      {
        cells: ["Basic Pay", formatPdfAmount(payslip.basicPay)],
        alignments: ["left", "right"],
      },
      {
        cells: ["HRA", formatPdfAmount(payslip.hra)],
        alignments: ["left", "right"],
      },
      {
        cells: ["Other Allowances", formatPdfAmount(payslip.otherAllowances)],
        alignments: ["left", "right"],
      },
      {
        cells: ["Gross Pay", formatPdfAmount(payslip.grossPay)],
        bold: true,
        alignments: ["left", "right"],
      },
    ];

    const deductionsRows: TableRow[] = [
      {
        cells: ["Deductions", "Amount (INR)"],
        bold: true,
        alignments: ["left", "right"],
      },
      {
        cells: ["PF", formatPdfAmount(payslip.pfDeduction)],
        alignments: ["left", "right"],
      },
      {
        cells: ["ESI", formatPdfAmount(payslip.esiDeduction)],
        alignments: ["left", "right"],
      },
      {
        cells: ["Professional Tax", formatPdfAmount(payslip.professionalTax)],
        alignments: ["left", "right"],
      },
      {
        cells: ["Other Deductions", formatPdfAmount(payslip.otherDeductions)],
        alignments: ["left", "right"],
      },
    ];

    const startY = doc.y;
    ensureSpace(doc, 120);
    drawBorderedTable(doc, left, startY, [halfWidth * 0.65, halfWidth * 0.35], earningsRows, {
      headerRowCount: 1,
      defaultFontSize: 9,
    });
    const earningsBottom = doc.y;

    doc.y = startY;
    drawBorderedTable(
      doc,
      left + halfWidth + 16,
      startY,
      [halfWidth * 0.65, halfWidth * 0.35],
      deductionsRows,
      { headerRowCount: 1, defaultFontSize: 9 },
    );
    doc.y = Math.max(doc.y, earningsBottom);

    doc.moveDown(1);
    ensureSpace(doc, 60);

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827");
    doc.text(
      `Net Pay: INR ${formatPdfAmount(payslip.netPay)}`,
      left,
      doc.y,
      { width: contentWidth },
    );
    doc.moveDown(0.25);
    doc.font("Helvetica-Oblique").fontSize(9).fillColor("#4b5563");
    doc.text(
      `In words: ${amountInIndianWords(payslip.netPay)}`,
      left,
      doc.y,
      { width: contentWidth },
    );

    if (employee.bankAccountNo) {
      doc.moveDown(0.75);
      doc.font("Helvetica").fontSize(9).fillColor("#374151");
      doc.text(
        `Bank Account: ${employee.bankAccountNo}${employee.bankIfsc ? ` (IFSC: ${employee.bankIfsc})` : ""}`,
        left,
        doc.y,
        { width: contentWidth },
      );
    }

    doc.moveDown(1.5);
    doc.font("Helvetica").fontSize(8).fillColor("#9ca3af");
    doc.text(
      "This is a computer-generated payslip and does not require a signature.",
      left,
      doc.y,
      { width: contentWidth, align: "center" },
    );

    doc.end();
  });
