import type { Design, Motif } from "@/lib/types";

type BomRow = {
  no: number;
  name: string;
  subCategory: string;
  qtyPerSet: number;
  weightGramsPerPc: number | null;
  totalWeightGrams: number | null;
  unitPrice: number;
  totalPrice: number;
};

export const exportDesignBomAsCsv = (design: Design, motifs: Motif[]): void => {
  const rows: BomRow[] = [];

  design.elements
    .filter((e) => e.type === "Motif")
    .forEach((el, i) => {
      const motif = motifs.find((m) => m.id === el.motifId);
      rows.push({
        no: i + 1,
        name: el.name,
        subCategory: motif?.subCategory ?? "—",
        qtyPerSet: el.qtyPerSet,
        weightGramsPerPc: el.weightGramsPerPc ?? null,
        totalWeightGrams:
          el.weightGramsPerPc != null ? el.weightGramsPerPc * el.qtyPerSet : null,
        unitPrice: el.unitValue ?? 0,
        totalPrice: (el.unitValue ?? 0) * el.qtyPerSet,
      });
    });

  const totalQty = rows.reduce((s, r) => s + r.qtyPerSet, 0);
  const totalWeight = rows.reduce(
    (s, r) => (r.totalWeightGrams != null ? s + r.totalWeightGrams : s),
    0,
  );
  const totalPrice = rows.reduce((s, r) => s + r.totalPrice, 0);

  const lines: string[] = [];

  lines.push(`Design Bill of Materials`);
  lines.push(`Design Code,${design.code}`);
  lines.push(`Design Name,${design.name ?? ""}`);
  lines.push(`Metal,${design.metal ?? ""}`);
  lines.push(`Purity,${design.purity ?? ""}`);
  lines.push(`Category,${design.category ?? ""}`);
  lines.push(`Generated,${new Date().toLocaleString("en-IN")}`);
  lines.push(``);

  lines.push(
    `#,Motif Name,Sub-category,Qty per Set,Wt per pc (g),Total Wt (g),Unit Price (₹),Total Price (₹)`,
  );

  for (const row of rows) {
    lines.push(
      [
        row.no,
        `"${row.name}"`,
        `"${row.subCategory}"`,
        row.qtyPerSet,
        row.weightGramsPerPc ?? "",
        row.totalWeightGrams?.toFixed(3) ?? "",
        row.unitPrice.toFixed(2),
        row.totalPrice.toFixed(2),
      ].join(","),
    );
  }

  lines.push(
    [
      "TOTAL",
      "",
      "",
      totalQty,
      "",
      totalWeight.toFixed(3),
      "",
      totalPrice.toFixed(2),
    ].join(","),
  );

  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BOM-${design.code}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
