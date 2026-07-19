"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ScanLine } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import {
  fetchHallmarkBatch,
  receiveHallmarkBatch,
  sendHallmarkBatch,
} from "@/lib/api/hallmark";
import { getApiErrorMessage } from "@/lib/api/client";
import { isValidHuid, normalizeHuid } from "@/lib/hallmark/huid";
import type { HallmarkBatchDetail } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/format";

const statusLabel: Record<HallmarkBatchDetail["status"], string> = {
  Draft: "Draft",
  SentToCenter: "Sent to Center",
  Received: "Received",
  PartiallyReceived: "Partially Received",
};

export default function HallmarkBatchDetailPage() {
  const params = useParams<{ id: string }>();
  const batchId = params.id;

  const [batch, setBatch] = useState<HallmarkBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [huidInput, setHuidInput] = useState("");
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const loadBatch = useCallback(async () => {
    try {
      const data = await fetchHallmarkBatch(batchId);
      setBatch(data);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load hallmark batch."));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void loadBatch();
  }, [loadBatch]);

  const pendingItems = useMemo(
    () => batch?.items.filter((item) => !item.huid) ?? [],
    [batch],
  );

  const canSend = batch?.status === "Draft";
  const canReceive =
    batch?.status === "SentToCenter" || batch?.status === "PartiallyReceived";

  const handleSend = async () => {
    if (!batch) return;
    setBusy(true);
    setError("");
    try {
      const updated = await sendHallmarkBatch(batch.id);
      setBatch(updated);
      setInfo("Batch marked as sent to hallmark center.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to mark batch as sent."));
    } finally {
      setBusy(false);
    }
  };

  const assignHuid = async (inventoryUnitId: string, huid: string) => {
    if (!batch) return;
    const normalized = normalizeHuid(huid);
    if (!isValidHuid(normalized)) {
      setError("HUID must be exactly 6 letters or numbers.");
      return;
    }

    setBusy(true);
    setError("");
    setInfo("");
    try {
      const updated = await receiveHallmarkBatch(batch.id, {
        items: [{ inventoryUnitId, huid: normalized }],
      });
      setBatch(updated);
      setScanCode("");
      setHuidInput("");
      setActiveUnitId(null);
      setInfo(`Recorded HUID ${normalized}.`);
      scanRef.current?.focus();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to record HUID."));
    } finally {
      setBusy(false);
    }
  };

  const handleScanItem = () => {
    if (!batch) return;
    const code = scanCode.trim();
    if (!code) return;
    const item = pendingItems.find(
      (row) => row.itemCode.toLowerCase() === code.toLowerCase(),
    );
    if (!item) {
      setError(`Item ${code} is not pending in this batch.`);
      return;
    }
    setActiveUnitId(item.inventoryUnitId);
    setError("");
    setInfo(`Scan HUID for ${item.itemCode}.`);
  };

  const handleSubmitHuid = () => {
    if (!activeUnitId) {
      setError("Scan or select an item first.");
      return;
    }
    void assignHuid(activeUnitId, huidInput);
  };

  if (loading) return <PageSkeleton />;

  if (!batch) {
    return (
      <div className="page-content">
        <p className="text-sm text-red-500">{error || "Batch not found."}</p>
      </div>
    );
  }

  return (
    <div className="page-content space-y-4">
      <Link href="/hallmark" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← Back to hallmark batches
      </Link>

      <PageHeader
        title={batch.batchNo}
        subtitle={`${batch.hallmarkCenter} · ${batch.receivedCount}/${batch.itemCount} received`}
        action={
          canSend ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSend()}
              className="btn-primary px-4 py-2 text-sm"
            >
              Mark Sent
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StatusBadge status={statusLabel[batch.status]} />
        {batch.sentAt && (
          <span className="text-zinc-500">Sent {formatDateTime(batch.sentAt)}</span>
        )}
        <span className="text-zinc-500">Created {formatDate(batch.createdAt)}</span>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}
      {info && (
        <div className="px-4 py-3 rounded-lg text-sm border border-emerald-200 bg-emerald-50 text-emerald-800">
          {info}
        </div>
      )}

      {canReceive && pendingItems.length > 0 && (
        <div className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <ScanLine size={16} />
            Receive HUIDs
          </h2>
          <p className="text-xs text-zinc-500">
            Scan each item barcode, then enter the 6-character HUID from BIS.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1 text-zinc-500 font-medium">
                Item barcode
              </label>
              <input
                ref={scanRef}
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleScanItem();
                  }
                }}
                placeholder="Scan item code…"
                className="input-field w-full px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs block mb-1 text-zinc-500 font-medium">
                HUID (6 characters)
              </label>
              <input
                value={huidInput}
                onChange={(e) => setHuidInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmitHuid();
                  }
                }}
                maxLength={6}
                placeholder="e.g. A1B2C3"
                className="input-field w-full px-3 py-2 text-sm font-mono uppercase"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleScanItem}
              className="btn-secondary px-3 py-2 text-sm"
            >
              Find item
            </button>
            <button
              type="button"
              disabled={busy || !activeUnitId || !huidInput.trim()}
              onClick={handleSubmitHuid}
              className="btn-primary px-3 py-2 text-sm"
            >
              Save HUID
            </button>
          </div>
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Product</th>
              <th>Metal</th>
              <th>HUID</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {batch.items.map((item) => (
              <tr
                key={item.id}
                className={
                  activeUnitId === item.inventoryUnitId ? "bg-amber-50" : undefined
                }
              >
                <td className="font-mono text-xs">{item.itemCode}</td>
                <td>{item.productName}</td>
                <td className="td-muted">
                  {item.metal} {item.purity} · {item.weightGrams}g
                </td>
                <td className="font-mono text-xs">{item.huid ?? "—"}</td>
                <td className="td-muted">
                  {item.receivedAt ? formatDateTime(item.receivedAt) : "Pending"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
