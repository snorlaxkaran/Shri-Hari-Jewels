import * as XLSX from "xlsx";

export const exportToExcel = (
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
): void => {
  const sheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  const headerRange = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1");
  for (let col = headerRange.s.c; col <= headerRange.e.c; col += 1) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = worksheet[cellAddress];
    if (!cell) continue;
    cell.s = { font: { bold: true } };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  const safeName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, safeName);
};
