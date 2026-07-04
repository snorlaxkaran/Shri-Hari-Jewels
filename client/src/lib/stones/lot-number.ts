/** Preview the next auto-generated lot number from existing lot numbers. */
export const previewNextLotNo = (
  existingLotNos: string[],
  date = new Date(),
): string => {
  const year = date.getFullYear();
  const prefix = `LOT-${year}-`;
  let max = 0;

  for (const lotNo of existingLotNos) {
    if (!lotNo.startsWith(prefix)) continue;
    const seq = parseInt(lotNo.split("-")[2] ?? "0", 10);
    if (!Number.isNaN(seq)) max = Math.max(max, seq);
  }

  return `${prefix}${String(max + 1).padStart(4, "0")}`;
};
