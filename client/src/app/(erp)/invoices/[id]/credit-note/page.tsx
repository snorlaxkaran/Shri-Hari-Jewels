"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import {
  fetchCreditNoteMeta,
  fetchInvoiceCreditSummary,
  issueCreditNote,
} from "@/lib/api/credit-notes";
import { fetchInvoiceById } from "@/lib/api/invoices";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  CreditNoteRefundMode,
  CreditNoteReason,
  Invoice,
} from "@/lib/types";
import { formatCurrency, parseMoneyInput } from "@/lib/format";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function IssueCreditNotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [reasons, setReasons] = useState<Array<{ value: CreditNoteReason; label: string }>>([]);
  const [refundModes, setRefundModes] = useState<
    Array<{ value: CreditNoteRefundMode; label: string }>
  >([]);
  const [remainingByItem, setRemainingByItem] = useState<Record<string, number>>({});
  const [remainingTotal, setRemainingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [reason, setReason] = useState<CreditNoteReason>("SalesReturn");
  const [reasonText, setReasonText] = useState("");
  const [refundMode, setRefundMode] = useState<CreditNoteRefundMode>("Cash");
  const [refundRef, setRefundRef] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [returnStock, setReturnStock] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    setError("");
    try {
      const [invoiceData, meta, summary] = await Promise.all([
        fetchInvoiceById(invoiceId),
        fetchCreditNoteMeta(),
        fetchInvoiceCreditSummary(invoiceId),
      ]);
      setInvoice(invoiceData);
      setReasons(meta.reasons);
      setRefundModes(meta.refundModes);
      setRemainingByItem(summary.remainingByItem);
      setRemainingTotal(summary.remainingCreditable);

      const initialAmounts: Record<string, string> = {};
      const initialReturn: Record<string, boolean> = {};
      for (const item of invoiceData.items) {
        const remaining = summary.remainingByItem[item.id] ?? 0;
        initialAmounts[item.id] = remaining > 0 ? String(remaining) : "0";
        initialReturn[item.id] = item.metal !== "Service";
      }
      setAmounts(initialAmounts);
      setReturnStock(initialReturn);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load invoice."));
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedTotal = useMemo(() => {
    if (!invoice) return 0;
    return invoice.items.reduce((sum, item) => {
      const value = parseMoneyInput(amounts[item.id] || "0");
      return sum + value;
    }, 0);
  }, [amounts, invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const items = invoice.items
      .map((item) => ({
        invoiceItemId: item.id,
        amount: parseMoneyInput(amounts[item.id] || "0"),
        returnStock: returnStock[item.id] ?? false,
      }))
      .filter((line) => line.amount > 0);

    if (items.length === 0) {
      setError("Enter a credit amount for at least one line.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const note = await issueCreditNote({
        invoiceId: invoice.id,
        reason,
        reasonText: reason === "Other" ? reasonText : reasonText || undefined,
        refundMode,
        refundRef: refundRef || undefined,
        items,
      });
      router.push(`/credit-notes/${note.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to issue credit note."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (!invoice) {
    return (
      <div className="page-content">
        <p className="text-sm text-red-600">{error || "Invoice not found."}</p>
      </div>
    );
  }

  return (
    <div className="page-content max-w-4xl">
      <Link
        href={`/invoices/${invoice.id}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to invoice
      </Link>

      <PageHeader
        title="Issue credit note"
        subtitle={`Against ${invoice.invoiceNo} · ${formatCurrency(remainingTotal)} remaining creditable`}
      />

      {error ? (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <section className="card-panel p-4 space-y-4">
          <h2 className="font-medium">Line items</h2>
          {invoice.items.map((item) => {
            const remaining = remainingByItem[item.id] ?? 0;
            return (
              <div key={item.id} className="grid gap-3 md:grid-cols-[1fr_140px_140px] border-t border-zinc-100 pt-3">
                <div>
                  <div className="font-medium text-sm">{item.productName}</div>
                  <div className="text-xs text-zinc-500">
                    {item.itemCode} · invoiced {formatCurrency(item.amount)} · remaining{" "}
                    {formatCurrency(remaining)}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Credit amount</label>
                  <input
                    className={fieldClass}
                    type="number"
                    min={0}
                    max={remaining}
                    step="0.01"
                    value={amounts[item.id] ?? "0"}
                    onChange={(e) =>
                      setAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={returnStock[item.id] ?? false}
                      disabled={item.metal === "Service"}
                      onChange={(e) =>
                        setReturnStock((prev) => ({ ...prev, [item.id]: e.target.checked }))
                      }
                    />
                    Return to QC
                  </label>
                </div>
              </div>
            );
          })}
          <p className="text-sm text-zinc-600">
            Selected credit total (taxable): <strong>{formatCurrency(selectedTotal)}</strong>
          </p>
        </section>

        <section className="card-panel p-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Reason</label>
            <select
              className={fieldClass}
              value={reason}
              onChange={(e) => setReason(e.target.value as CreditNoteReason)}
            >
              {reasons.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Refund mode</label>
            <select
              className={fieldClass}
              value={refundMode}
              onChange={(e) => setRefundMode(e.target.value as CreditNoteRefundMode)}
            >
              {refundModes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {reason === "Other" ? (
            <div className="md:col-span-2">
              <label className={labelClass}>Reason details</label>
              <input
                className={fieldClass}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="md:col-span-2">
              <label className={labelClass}>Additional notes (optional)</label>
              <input
                className={fieldClass}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
              />
            </div>
          )}
          <div className="md:col-span-2">
            <label className={labelClass}>Refund reference (optional)</label>
            <input
              className={fieldClass}
              placeholder="UPI ref, cheque no., etc."
              value={refundRef}
              onChange={(e) => setRefundRef(e.target.value)}
            />
          </div>
        </section>

        <div className="flex gap-3">
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? "Issuing…" : "Issue credit note"}
          </button>
          <Link href={`/invoices/${invoice.id}`} className="row-action-btn">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
