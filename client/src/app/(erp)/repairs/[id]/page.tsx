"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageRepairs } from "@/lib/auth/permissions";
import {
  approveRepair,
  createRepairRedo,
  deliverRepair,
  fetchRepairById,
  rejectRepair,
  sendRepairForApproval,
  setRepairEstimate,
  updateRepairStatus,
} from "@/lib/api/repairs";
import { openInvoicePdf } from "@/lib/api/invoices";
import { preparePdfViewerTab } from "@/lib/open-pdf";
import { getApiErrorMessage } from "@/lib/api/client";
import type { PaymentMode, RepairOrder } from "@/lib/types";
import { formatCurrency, formatDateTime, parseMoneyInput } from "@/lib/format";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const PAYMENT_MODES: PaymentMode[] = ["Cash", "UPI", "Card"];

export default function RepairDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user ? canManageRepairs(user.role) : false;
  const repairId = params.id;

  const [repair, setRepair] = useState<RepairOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const [estimateCost, setEstimateCost] = useState("");
  const [estimateDate, setEstimateDate] = useState("");
  const [estimateNotes, setEstimateNotes] = useState("");
  const [approvedVia, setApprovedVia] = useState("In-person");
  const [rejectionReason, setRejectionReason] = useState("");
  const [karigarName, setKarigarName] = useState("");
  const [deliveredToName, setDeliveredToName] = useState("");
  const [finalCost, setFinalCost] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");

  const load = useCallback(async () => {
    if (!repairId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchRepairById(repairId);
      setRepair(data);
      setEstimateCost(
        data.estimatedCost != null ? String(data.estimatedCost) : "",
      );
      setEstimateDate(
        data.estimatedReadyDate
          ? data.estimatedReadyDate.slice(0, 10)
          : "",
      );
      setKarigarName(data.assignedKarigarName ?? "");
      setDeliveredToName(data.customerName);
      setFinalCost(
        data.finalCost != null
          ? String(data.finalCost)
          : data.estimatedCost != null
            ? String(data.estimatedCost)
            : "",
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load repair order."));
      setRepair(null);
    } finally {
      setLoading(false);
    }
  }, [repairId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action: () => Promise<RepairOrder>, message: string) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const updated = await action();
      setRepair(updated);
      setSuccess(message);
    } catch (err) {
      setError(getApiErrorMessage(err, "Action failed."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (!repair) {
    return (
      <div className="page-content">
        <p className="text-sm text-red-600">{error || "Repair not found."}</p>
      </div>
    );
  }

  const status = repair.status;

  return (
    <div className="page-content max-w-4xl">
      <Link
        href="/repairs"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-4"
      >
        <ArrowLeft size={16} />
        Back to repairs
      </Link>

      <PageHeader
        title={repair.repairNo}
        subtitle={`${repair.customerName} · ${repair.customerMobile}`}
        action={<StatusBadge status={repair.status} />}
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-green-200 bg-green-50 text-green-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="surface-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-800">Item & work</h2>
            <p className="text-sm">{repair.itemDescription}</p>
            {repair.intakeCondition && (
              <p className="text-sm text-zinc-600">
                <span className="font-medium">Condition:</span> {repair.intakeCondition}
              </p>
            )}
            <p className="text-sm text-zinc-600">
              <span className="font-medium">Requested:</span> {repair.requestedWork}
            </p>
            {repair.assignedKarigarName && (
              <p className="text-sm text-zinc-600">
                <span className="font-medium">Karigar:</span> {repair.assignedKarigarName}
              </p>
            )}
          </section>

          {(repair.photos?.length ?? 0) > 0 && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold text-zinc-800 mb-3">Photos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {repair.photos!.map((photo) => (
                  <div key={photo.id} className="rounded-lg overflow-hidden border border-zinc-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`${photo.stage} photo`}
                      className="w-full aspect-square object-cover"
                    />
                    <p className="text-[11px] px-2 py-1 text-zinc-500">{photo.stage}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-zinc-800 mb-3">Status timeline</h2>
            <ol className="space-y-3">
              {(repair.statusLogs ?? []).map((log) => (
                <li key={log.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={log.status} />
                      <span className="text-xs text-zinc-400">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{log.performedByName}</p>
                    {log.notes && (
                      <p className="text-sm text-zinc-600 mt-1">{log.notes}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-4">
          <section className="surface-card p-5 space-y-2 text-sm">
            <h2 className="font-semibold text-zinc-800">Financials</h2>
            <div className="flex justify-between">
              <span className="text-zinc-500">Estimate</span>
              <span>{repair.estimatedCost != null ? formatCurrency(repair.estimatedCost) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Deposit</span>
              <span>{formatCurrency(repair.depositAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Final cost</span>
              <span>{repair.finalCost != null ? formatCurrency(repair.finalCost) : "—"}</span>
            </div>
            {repair.invoiceNo && (
              <button
                type="button"
                className="text-blue-600 text-sm hover:underline mt-2"
                onClick={() => {
                  if (!repair.invoiceId) return;
                  const tab = preparePdfViewerTab();
                  void openInvoicePdf(
                    repair.invoiceId,
                    `${repair.invoiceNo}.pdf`,
                    tab,
                  ).catch(() => tab?.close());
                }}
              >
                Invoice {repair.invoiceNo}
              </button>
            )}
          </section>

          {canManage && (
            <section className="surface-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-800">Actions</h2>

              {["Received", "Estimated"].includes(status) && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">Add or update estimate</p>
                  <input
                    className={fieldClass}
                    value={estimateCost}
                    onChange={(e) => setEstimateCost(e.target.value)}
                    placeholder="Estimated cost"
                  />
                  <input
                    type="date"
                    className={fieldClass}
                    value={estimateDate}
                    onChange={(e) => setEstimateDate(e.target.value)}
                  />
                  <input
                    className={fieldClass}
                    value={estimateNotes}
                    onChange={(e) => setEstimateNotes(e.target.value)}
                    placeholder="Notes (optional)"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    className="btn-secondary w-full py-2 text-sm"
                    onClick={() =>
                      runAction(
                        () =>
                          setRepairEstimate(repair.id, {
                            estimatedCost: parseMoneyInput(estimateCost),
                            estimatedReadyDate: estimateDate || undefined,
                            notes: estimateNotes || undefined,
                          }),
                        "Estimate saved.",
                      )
                    }
                  >
                    Save estimate
                  </button>
                </div>
              )}

              {status === "Estimated" && (
                <button
                  type="button"
                  disabled={busy}
                  className="btn-primary w-full py-2 text-sm"
                  onClick={() =>
                    runAction(
                      () => sendRepairForApproval(repair.id),
                      "Sent to customer for approval.",
                    )
                  }
                >
                  Send for approval
                </button>
              )}

              {status === "Awaiting Approval" && (
                <div className="space-y-2">
                  <select
                    className={fieldClass}
                    value={approvedVia}
                    onChange={(e) => setApprovedVia(e.target.value)}
                  >
                    {["In-person", "SMS", "WhatsApp", "Call"].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    className="btn-primary w-full py-2 text-sm"
                    onClick={() =>
                      runAction(
                        () => approveRepair(repair.id, { approvedVia }),
                        "Customer approved the estimate.",
                      )
                    }
                  >
                    Mark approved
                  </button>
                  <textarea
                    className={`${fieldClass} min-h-[60px]`}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Rejection reason"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    className="btn-secondary w-full py-2 text-sm text-red-700 border-red-200"
                    onClick={() =>
                      runAction(
                        () =>
                          rejectRepair(repair.id, {
                            rejectionReason,
                          }),
                        "Estimate rejected by customer.",
                      )
                    }
                  >
                    Customer declined
                  </button>
                </div>
              )}

              {status === "Approved" && (
                <div className="space-y-2">
                  <input
                    className={fieldClass}
                    value={karigarName}
                    onChange={(e) => setKarigarName(e.target.value)}
                    placeholder="Karigar name"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    className="btn-primary w-full py-2 text-sm"
                    onClick={() =>
                      runAction(
                        () =>
                          updateRepairStatus(repair.id, {
                            status: "In Progress",
                            assignedKarigarName: karigarName,
                          }),
                        "Work started in workshop.",
                      )
                    }
                  >
                    Assign karigar & start
                  </button>
                </div>
              )}

              {status === "In Progress" && (
                <button
                  type="button"
                  disabled={busy}
                  className="btn-primary w-full py-2 text-sm"
                  onClick={() =>
                    runAction(
                      () =>
                        updateRepairStatus(repair.id, {
                          status: "Quality Check",
                        }),
                      "Moved to quality check.",
                    )
                  }
                >
                  Move to QC
                </button>
              )}

              {status === "Quality Check" && (
                <button
                  type="button"
                  disabled={busy}
                  className="btn-primary w-full py-2 text-sm"
                  onClick={() =>
                    runAction(
                      () =>
                        updateRepairStatus(repair.id, {
                          status: "Ready for Pickup",
                        }),
                      "Ready for customer pickup.",
                    )
                  }
                >
                  Mark ready for pickup
                </button>
              )}

              {status === "Ready for Pickup" && (
                <div className="space-y-2">
                  <input
                    className={fieldClass}
                    value={deliveredToName}
                    onChange={(e) => setDeliveredToName(e.target.value)}
                    placeholder="Delivered to (name)"
                  />
                  <input
                    className={fieldClass}
                    value={finalCost}
                    onChange={(e) => setFinalCost(e.target.value)}
                    placeholder="Final cost"
                  />
                  <select
                    className={fieldClass}
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    className="btn-primary w-full py-2 text-sm"
                    onClick={() =>
                      runAction(
                        () =>
                          deliverRepair(repair.id, {
                            deliveredToName,
                            finalCost: parseMoneyInput(finalCost),
                            paymentMode,
                          }),
                        "Delivered and invoiced.",
                      )
                    }
                  >
                    Deliver & invoice
                  </button>
                </div>
              )}

              {status === "Delivered" && (
                <button
                  type="button"
                  disabled={busy}
                  className="btn-secondary w-full py-2 text-sm"
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      const redo = await createRepairRedo(repair.id);
                      router.push(`/repairs/${redo.id}`);
                    } catch (err) {
                      setError(getApiErrorMessage(err, "Failed to create redo."));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Create redo / rework
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
