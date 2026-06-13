"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, X } from "lucide-react";
import type { Sale } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api/client";
import { pollSaleStatus } from "@/lib/api/sales";

type UpiPaymentModalProps = {
  open: boolean;
  sale: Sale;
  totalAmount?: number;
  itemSummary?: string;
  pollSaleId?: string;
  upiQrString?: string;
  upiQrImageUrl?: string;
  autoCapture: boolean;
  onClose: () => void;
  onPaid: () => void | Promise<void>;
  onConfirm: (paymentRef?: string) => Promise<void>;
  onCancel: () => Promise<void>;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function UpiPaymentModal({
  open,
  sale,
  totalAmount,
  itemSummary,
  pollSaleId,
  upiQrString,
  upiQrImageUrl,
  autoCapture,
  onClose,
  onPaid,
  onConfirm,
  onCancel,
}: UpiPaymentModalProps) {
  const [paymentRef, setPaymentRef] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [waiting, setWaiting] = useState(autoCapture);
  const paidRef = useRef(false);

  const amount = totalAmount ?? sale.dealPrice;
  const statusSaleId = pollSaleId ?? sale.id;
  const summary = itemSummary ?? sale.itemCode;

  useEffect(() => {
    if (!open || !autoCapture) return;

    paidRef.current = false;
    setWaiting(true);
    setError("");

    const interval = setInterval(async () => {
      if (paidRef.current) return;
      try {
        const result = await pollSaleStatus(statusSaleId);
        const completed =
          ("sales" in result &&
            result.sales.every((s) => s.paymentStatus === "Completed")) ||
          ("sale" in result && result.sale.paymentStatus === "Completed");

        if (!result.requiresConfirmation && completed) {
          paidRef.current = true;
          setWaiting(false);
          await onPaid();
        }
      } catch {
        // Keep polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [open, autoCapture, statusSaleId, onPaid]);

  if (!open) return null;

  const handleConfirm = async () => {
    setError("");
    setSubmitting(true);
    try {
      await onConfirm(paymentRef.trim() || undefined);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to confirm payment."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setError("");
    setCancelling(true);
    try {
      await onCancel();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to cancel sale."));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
      <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900">UPI Payment</h2>
          <button
            onClick={onClose}
            disabled={submitting || cancelling || waiting}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-center">
          <p className="text-sm text-zinc-600">
            Ask the customer to scan and pay{" "}
            <span className="font-semibold text-zinc-900">{formatCurrency(amount)}</span>
          </p>

          <div className="flex justify-center p-4 bg-white border border-zinc-200 rounded-xl min-h-[232px] items-center">
            {upiQrImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={upiQrImageUrl} alt="UPI QR code" width={200} height={200} className="rounded" />
            ) : upiQrString ? (
              <QRCodeSVG value={upiQrString} size={200} level="M" />
            ) : null}
          </div>

          <p className="text-xs text-zinc-400 font-mono break-all">{summary}</p>

          {autoCapture && waiting && (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <Loader2 size={16} className="animate-spin" />
              Waiting for payment…
            </div>
          )}

          {!autoCapture && (
            <>
              <div className="text-left">
                <label className={labelClass}>UPI reference no. (optional)</label>
                <input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UTR / transaction ID"
                  className={fieldClass}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={submitting || cancelling}
                  className="btn-secondary flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  {cancelling ? "Cancelling…" : "Cancel sale"}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting || cancelling}
                  className="btn-primary flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  {submitting ? "Confirming…" : "Payment received"}
                </button>
              </div>
            </>
          )}

          {autoCapture && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="btn-secondary w-full px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel sale"}
            </button>
          )}

          {error && <p className="text-xs text-red-500 text-left">{error}</p>}
        </div>
      </div>
    </div>
  );
}
