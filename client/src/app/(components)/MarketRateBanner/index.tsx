"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Settings2 } from "lucide-react";
import {
  fetchCurrentMarketRates,
  refreshMarketRates,
} from "@/lib/api/market-rates";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageSettings } from "@/lib/auth/permissions";
import type { MarketRatesCurrent } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import MarketRateOverrideModal from "@/app/(components)/MarketRateOverrideModal";

export default function MarketRateBanner() {
  const { user } = useAuth();
  const isAdmin = user ? canManageSettings(user.role) : false;
  const [rates, setRates] = useState<MarketRatesCurrent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overrideOpen, setOverrideOpen] = useState(false);

  const loadRates = async () => {
    try {
      const data = await fetchCurrentMarketRates();
      setRates(data);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load market rates."));
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await refreshMarketRates();
      setRates(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to refresh rates."));
    } finally {
      setLoading(false);
    }
  };

  if (!rates && !error) return null;

  return (
    <>
      <div className="mb-4 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-700">
            <span>
              <strong>22K Gold:</strong>{" "}
              {rates?.gold22k != null
                ? `${formatCurrency(rates.gold22k)}/g`
                : "—"}
            </span>
            <span className="text-zinc-300">·</span>
            <span>
              <strong>925 Silver:</strong>{" "}
              {rates?.silver925 != null
                ? `${formatCurrency(rates.silver925)}/g`
                : "—"}
            </span>
            <span className="text-zinc-300">·</span>
            <span>
              Making: Gold {rates?.goldMakingChargesPct ?? 17}% / Silver{" "}
              {rates?.silverMakingChargesPct ?? 17}%
            </span>
            {rates?.isStale && (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <AlertTriangle size={14} />
                Rates not updated today — prices may be inaccurate.
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {rates?.fetchedAt && (
              <span>
                Updated: {formatDateTime(rates.fetchedAt)}
                {rates.source ? ` via ${rates.source}` : ""}
              </span>
            )}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="btn-secondary inline-flex items-center gap-1 px-2.5 py-1 text-xs disabled:opacity-50"
                >
                  <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideOpen(true)}
                  className="btn-secondary inline-flex items-center gap-1 px-2.5 py-1 text-xs"
                >
                  <Settings2 size={13} />
                  Override
                </button>
              </>
            )}
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      {rates && (
        <MarketRateOverrideModal
          open={overrideOpen}
          onClose={() => setOverrideOpen(false)}
          initial={rates}
          onSaved={(updated) => {
            setRates(updated);
            setOverrideOpen(false);
          }}
        />
      )}
    </>
  );
}
