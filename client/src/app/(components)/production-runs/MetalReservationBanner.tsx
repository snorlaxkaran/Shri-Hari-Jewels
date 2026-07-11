"use client";

import { useState } from "react";
import type { MetalReservationStatus, ProductionRun } from "@/lib/types";
import { reserveProductionRunMetal } from "@/lib/api/production-runs";
import { getApiErrorMessage } from "@/lib/api/client";

type MetalReservationBannerProps = {
  run: ProductionRun;
  canManage: boolean;
  onUpdated: (run: ProductionRun) => void;
};

export default function MetalReservationBanner({
  run,
  canManage,
  onUpdated,
}: MetalReservationBannerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const reservation: MetalReservationStatus | undefined = run.metalReservation;
  if (!reservation) return null;

  const handleReserve = async () => {
    setSubmitting(true);
    setActionError("");
    try {
      const updated = await reserveProductionRunMetal(run.id);
      onUpdated(updated);
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Failed to reserve metal."));
    } finally {
      setSubmitting(false);
    }
  };

  if (reservation.reserved) {
    return (
      <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-emerald-200 bg-emerald-50 text-emerald-900">
        <p className="font-medium">Raw metal reserved</p>
        <p className="mt-1 text-emerald-800">
          {reservation.deductedGrams}g deducted from Raw Inventory for {run.setsOrdered}{" "}
          set{run.setsOrdered !== 1 ? "s" : ""} ({reservation.perSetGrams}g per set ×{" "}
          {run.setsOrdered} = {reservation.requiredGrams}g).
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">Raw metal not reserved yet</p>
          <p className="mt-1">
            This run needs{" "}
            <strong>
              {reservation.requiredGrams}g
            </strong>{" "}
            ({reservation.perSetGrams}g × {run.setsOrdered} sets) from Raw Inventory.
          </p>
          {reservation.error && (
            <p className="mt-1 text-xs text-red-800">{reservation.error}</p>
          )}
          {actionError && (
            <p className="mt-1 text-xs text-red-800">{actionError}</p>
          )}
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => void handleReserve()}
            disabled={submitting}
            className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap"
          >
            {submitting ? "Reserving…" : "Reserve metal now"}
          </button>
        )}
      </div>
    </div>
  );
}
