"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Motif, MotifPriceDrift } from "@/lib/types";
import {
  fetchMotifPriceDrift,
  recalculateMotifPrice,
} from "@/lib/api/motifs";
import { getApiErrorMessage } from "@/lib/api/client";

type Props = {
  motifs: Motif[];
  canManage: boolean;
  onRecalculated: () => void;
};

export default function MotifPriceDriftBanner({
  motifs,
  canManage,
  onRecalculated,
}: Props) {
  const [drifts, setDrifts] = useState<MotifPriceDrift[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const motifIds = useMemo(
    () =>
      motifs
        .filter((m) => (m.stones?.length ?? 0) > 0)
        .map((m) => m.id)
        .join(","),
    [motifs],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const stale: MotifPriceDrift[] = [];
      for (const motif of motifs) {
        if (!(motif.stones?.length ?? 0)) continue;
        try {
          const drift = await fetchMotifPriceDrift(motif.id);
          if (drift.isStale) stale.push(drift);
        } catch {
          /* ignore per-motif failures */
        }
      }
      if (!cancelled) setDrifts(stale);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [motifIds, motifs]);

  const handleRecalculate = async (motifId: string) => {
    setActing(motifId);
    setError("");
    try {
      await recalculateMotifPrice(motifId);
      setDrifts((prev) => prev.filter((d) => d.motifId !== motifId));
      onRecalculated();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to recalculate motif price."));
    } finally {
      setActing(null);
    }
  };

  if (drifts.length === 0) return null;

  return (
    <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-amber-200 bg-amber-50 space-y-2">
      <div className="flex items-center gap-2 text-amber-800 font-medium">
        <AlertTriangle size={16} />
        Stone prices changed — motif costs may be outdated
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <ul className="space-y-2">
        {drifts.map((drift) => (
          <li
            key={drift.motifId}
            className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900"
          >
            <span>
              {drift.motifName}: stored ₹
              {drift.storedPrice.toLocaleString("en-IN")} → calculated ₹
              {drift.calculatedPrice.toLocaleString("en-IN")}
            </span>
            {canManage && (
              <button
                type="button"
                disabled={acting === drift.motifId}
                onClick={() => void handleRecalculate(drift.motifId)}
                className="btn-secondary px-2 py-1 text-xs"
              >
                {acting === drift.motifId ? "Updating…" : "Recalculate"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
