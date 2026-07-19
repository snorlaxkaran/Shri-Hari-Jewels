"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import type { BarcodeLabelData } from "@/lib/inventory/barcode-label";

type BarcodeLabelSheetProps = {
  labels: BarcodeLabelData[];
};

function BarcodeSvg({ value, className }: { value: string; className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const node = svgRef.current;
    if (!node || !value) return;
    try {
      JsBarcode(node, value, {
        format: "CODE128",
        width: 1,
        height: 22,
        margin: 0,
        displayValue: false,
      });
    } catch {
      JsBarcode(node, value, {
        format: "CODE39",
        width: 1,
        height: 22,
        margin: 0,
        displayValue: false,
      });
    }
  }, [value]);

  return <svg ref={svgRef} className={className} />;
}

export function BarcodeLabelSheet({ labels }: BarcodeLabelSheetProps) {
  return (
    <div className="barcode-print-root">
      {labels.map((label) => (
        <article key={label.itemCode} className="barcode-label">
          <div className="barcode-label__primary">
            <p className="barcode-label__code">{label.itemCode}</p>
            <div className="barcode-label__barcode">
              <BarcodeSvg value={label.itemCode} className="barcode-label__svg" />
            </div>
          </div>
          <div className="barcode-label__meta">
            <span className="barcode-label__name">{label.name}</span>
            <span className="barcode-label__weight">{label.weightGrams}g</span>
            {label.huid ? (
              <span className="barcode-label__huid">HUID {label.huid}</span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export function useBarcodeLabelPrint() {
  const [labels, setLabels] = useState<BarcodeLabelData[] | null>(null);
  const printId = useId();

  const printLabels = useCallback((next: BarcodeLabelData[]) => {
    if (!next.length) return;
    setLabels(next);
  }, []);

  useEffect(() => {
    if (!labels?.length) return;
    const timer = window.setTimeout(() => {
      document.body.dataset.barcodePrint = printId;
      window.print();
      window.setTimeout(() => {
        delete document.body.dataset.barcodePrint;
        setLabels(null);
      }, 300);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [labels, printId]);

  const sheet =
    labels && labels.length > 0 ? (
      <BarcodeLabelSheet labels={labels} />
    ) : null;

  return { printLabels, sheet };
}

export function rowToBarcodeLabel(row: {
  itemCode: string;
  name: string;
  weightGrams: number;
  huid?: string;
  hallmarkNumber?: string;
}): BarcodeLabelData {
  return {
    itemCode: row.itemCode,
    name: row.name,
    weightGrams: row.weightGrams,
    huid: row.huid ?? row.hallmarkNumber,
  };
}
