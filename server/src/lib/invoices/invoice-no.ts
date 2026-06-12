export const generateInvoiceNo = (existing: string[]): string => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const sequences = existing
    .filter((no) => no.startsWith(prefix))
    .map((no) => parseInt(no.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));

  const next = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
};
