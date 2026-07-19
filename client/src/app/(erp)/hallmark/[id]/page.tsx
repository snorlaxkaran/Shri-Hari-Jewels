"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ClipboardList, Printer, ScanLine } from "lucide-react";
import HuidLink from "@/app/(components)/hallmark/HuidLink";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import {
  fetchHallmarkBatch,
  receiveHallmarkBatch,
  sendHallmarkBatch,
  updateHallmarkBatch,
} from "@/lib/api/hallmark";
import { fetchSettings } from "@/lib/api/settings";
import { getApiErrorMessage } from "@/lib/api/client";
import { parseBulkHuidPaste, type BulkHuidRow } from "@/lib/hallmark/bulk-entry";
import { isValidHuid, normalizeHuid } from "@/lib/hallmark/huid";
import { printHallmarkSubmissionSlip } from "@/lib/hallmark/print-slip";
import type { HallmarkBatchDetail } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/format";

const statusLabel: Record<HallmarkBatchDetail["status"], string> = {
  Draft: "Draft",
  SentToCenter: "Sent to Center",
  Received: "Received",
  PartiallyReceived: "Partially Received",
};

type ReceiveMode = "scan" | "bulk";

export default function HallmarkBatchDetailPage() {
  const params = useParams<{ id: string }>();
  const batchId = params.id;

  const [batch, setBatch] = useState<HallmarkBatchDetail | null>(null);
  const [shopName, setShopName] = useState("Your shop");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [receiveMode, setReceiveMode] = useState<ReceiveMode>("scan");
  const [scanCode, setScanCode] = useState("");
  const [huidInput, setHuidInput] = useState("");
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [bulkPaste, setBulkPaste] = useState("");
  const [bulkPreview, setBulkPreview] = useState<BulkHuidRow[] | null>(null);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [feeInput, setFeeInput] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);

  const loadBatch = useCallback(async () => {
    try {
      const data = await fetchHallmarkBatch(batchId);
      setBatch(data);
      setFeeInput(
        data.hallmarkingFeeTotal != null ? String(data.hallmarkingFeeTotal) : "",
      );
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load hallmark batch."));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void loadBatch();
    fetchSettings()
      .then((settings) => setShopName(settings.businessName))
      .catch(() => setShopName("Your shop"));
  }, [loadBatch]);

  const pendingItems = useMemo(
    () => batch?.items.filter((item) => !item.huid) ?? [],
    [batch],
  );

  const canSend = batch?.status === "Draft";
  const canReceive =
    batch?.status === "SentToCenter" || batch?.status === "PartiallyReceived";
  const canPrintSlip = batch?.status !== "Draft";
  const canEditFee =
    batch?.status === "SentToCenter" ||
    batch?.status === "PartiallyReceived" ||
    batch?.status === "Received";

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

  const handleParseBulk = () => {
    const parsed = parseBulkHuidPaste(bulkPaste, pendingItems);
    if (!parsed.ok) {
      setBulkPreview(null);
      setBulkErrors(parsed.errors);
      return;
    }
    setBulkErrors([]);
    setBulkPreview(parsed.rows);
    setInfo(`Ready to save ${parsed.rows.length} HUID(s).`);
  };

  const handleSubmitBulk = async () => {
    if (!batch || !bulkPreview?.length) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const updated = await receiveHallmarkBatch(batch.id, {
        items: bulkPreview.map((row) => ({
          inventoryUnitId: row.inventoryUnitId,
          huid: row.huid,
        })),
      });
      setBatch(updated);
      setBulkPaste("");
      setBulkPreview(null);
      setBulkErrors([]);
      setInfo(`Recorded ${bulkPreview.length} HUID(s).`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save bulk HUIDs."));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveFee = async () => {
    if (!batch) return;
    const trimmed = feeInput.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) {
      setError("Hallmarking fee must be zero or greater.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const updated = await updateHallmarkBatch(batch.id, {
        hallmarkingFeeTotal: parsed,
      });
      setBatch(updated);
      setFeeInput(
        updated.hallmarkingFeeTotal != null
          ? String(updated.hallmarkingFeeTotal)
          : "",
      );
      setInfo("Hallmarking fee saved.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save hallmarking fee."));
    } finally {
      setBusy(false);
    }
  };

  const handlePrintSlip = () => {
    if (!batch) return;
    printHallmarkSubmissionSlip(batch, shopName);
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
          <div className="flex flex-wrap gap-2">
            {canPrintSlip && (
              <button
                type="button"
                disabled={busy}
                onClick={handlePrintSlip}
                className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Printer size={16} />
                Print Slip
              </button>
            )}
            {canSend && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSend()}
                className="btn-primary px-4 py-2 text-sm"
              >
                Mark Sent
              </button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StatusBadge status={statusLabel[batch.status]} />
        {batch.sentAt && (
          <span className="text-zinc-500">Sent {formatDateTime(batch.sentAt)}</span>
        )}
        <span className="text-zinc-500">Created {formatDate(batch.createdAt)}</span>
      </div>

      {canEditFee && (
        <div className="surface-card p-5">
          <label className="text-xs text-zinc-500 font-medium block mb-1">
            Hallmarking fee (total ₹)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
              className="input-field w-40 px-3 py-2 text-sm"
              placeholder="e.g. 420.00"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSaveFee()}
              className="btn-secondary px-3 py-2 text-sm"
            >
              Save
            </button>
          </div>
        </div>
      )}

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <ScanLine size={16} />
              Receive HUIDs
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReceiveMode("scan")}
                className={`tab-btn ${receiveMode === "scan" ? "tab-btn-active" : "tab-btn-inactive"}`}
              >
                Scan
              </button>
              <button
                type="button"
                onClick={() => setReceiveMode("bulk")}
                className={`tab-btn ${receiveMode === "bulk" ? "tab-btn-active" : "tab-btn-inactive"}`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardList size={14} />
                  Bulk Entry
                </span>
              </button>
            </div>
          </div>

          {receiveMode === "scan" ? (
            <>
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
            </>
          ) : (
            <>
              <p className="text-xs text-zinc-500">
                Paste item code and HUID pairs from the AHC spreadsheet — one pair per
                line, separated by space, tab, or comma.
              </p>
              <textarea
                value={bulkPaste}
                onChange={(e) => {
                  setBulkPaste(e.target.value);
                  setBulkPreview(null);
                  setBulkErrors([]);
                }}
                rows={8}
                placeholder={"ITEM001  A1B2C3\nITEM002  D4E5F6\nITEM003  G7H8I9"}
                className="input-field w-full px-3 py-2 text-sm font-mono"
              />
              {bulkErrors.length > 0 && (
                <ul className="text-sm text-red-600 space-y-1">
                  {bulkErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || !bulkPaste.trim()}
                  onClick={handleParseBulk}
                  className="btn-secondary px-3 py-2 text-sm"
                >
                  Preview
                </button>
                <button
                  type="button"
                  disabled={busy || !bulkPreview?.length}
                  onClick={() => void handleSubmitBulk()}
                  className="btn-primary px-3 py-2 text-sm"
                >
                  Save {bulkPreview?.length ?? 0} HUID(s)
                </button>
              </div>
              {bulkPreview && bulkPreview.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-zinc-200">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Product</th>
                        <th>HUID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.map((row) => (
                        <tr key={row.inventoryUnitId}>
                          <td className="font-mono text-xs">{row.itemCode}</td>
                          <td>{row.productName}</td>
                          <td>
                            <HuidLink huid={row.huid} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
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
                <td>
                  {item.huid ? <HuidLink huid={item.huid} /> : <span className="text-zinc-400">—</span>}
                </td>
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
