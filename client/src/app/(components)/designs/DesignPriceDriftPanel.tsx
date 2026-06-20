"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { DesignElementPriceDrift } from "@/lib/types";
import {
  acceptDesignElementPrice,
  fetchDesignPriceDrift,
} from "@/lib/api/designs";
import { getApiErrorMessage } from "@/lib/api/client";

type Props = {
  designId: string;
  canManage: boolean;
  onUpdated: () => void;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
};

export default function DesignPriceDriftPanel({
  designId,
  canManage,
  onUpdated,
}: Props) {
  const [drifts, setDrifts] = useState<DesignElementPriceDrift[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDrifts(await fetchDesignPriceDrift(designId));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not check motif price drift."));
    } finally {
      setLoading(false);
    }
  }, [designId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAccept = async (drift: DesignElementPriceDrift) => {
    setActing(drift.elementId);
    try {
      await acceptDesignElementPrice(
        designId,
        drift.elementId,
        drift.motifId,
      );
      await load();
      onUpdated();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update snapshot price."));
    } finally {
      setActing(null);
    }
  };

  if (loading || drifts.length === 0) return null;

  return (
    <section className="surface-card rounded-xl p-5 space-y-3 border border-amber-200 bg-amber-50/50">
      <div className="flex items-center gap-2 text-amber-800">
        <AlertTriangle size={16} />
        <h2 className="text-sm font-semibold">Motif price drift</h2>
      </div>
      <p className="text-xs text-amber-700">
        Live motif prices differ from what this BOM snapshot. Past production
        runs are unaffected; accepting updates costing for future runs.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <ul className="space-y-3">
        {drifts.map((drift) => (
          <li
            key={drift.elementId}
            className="flex flex-wrap items-center justify-between gap-3 text-sm border border-amber-100 rounded-lg px-3 py-2 bg-white"
          >
            <div>
              <p className="font-medium text-zinc-900">{drift.elementName}</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                Price changed: ₹
                {drift.snapshotUnitValue.toLocaleString("en-IN")} → ₹
                {drift.liveMotifPrice.toLocaleString("en-IN")}
                {drift.lastMotifPriceChange && (
                  <>
                    {" "}
                    (updated {formatDate(drift.lastMotifPriceChange.at)} by{" "}
                    {drift.lastMotifPriceChange.by})
                  </>
                )}
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                disabled={acting === drift.elementId}
                onClick={() => void handleAccept(drift)}
                className="btn-primary px-3 py-1.5 text-xs"
              >
                {acting === drift.elementId ? "Updating…" : "Accept new price"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
