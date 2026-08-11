"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import {
  fetchDebitNoteMeta,
  issueDebitNote,
} from "@/lib/api/debit-notes";
import { fetchPurchaseBills } from "@/lib/api/purchase-bills";
import { getApiErrorMessage } from "@/lib/api/client";
import type { DebitNoteReason, PurchaseBill } from "@/lib/types";
import { formatCurrency, parseMoneyInput } from "@/lib/format";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function IssueDebitNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBillId = searchParams.get("billId") ?? "";

  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [reasons, setReasons] = useState<Array<{ value: DebitNoteReason; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [purchaseBillId, setPurchaseBillId] = useState(initialBillId);
  const [reason, setReason] = useState<DebitNoteReason>("VendorReturn");
  const [reasonText, setReasonText] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [gstAmount, setGstAmount] = useState("");
  const [reverseStock, setReverseStock] = useState(true);

  const selectedBill = useMemo(
    () => bills.find((bill) => bill.id === purchaseBillId) ?? null,
    [bills, purchaseBillId],
  );

  const total = useMemo(() => {
    return parseMoneyInput(subtotal || "0") + parseMoneyInput(gstAmount || "0");
  }, [subtotal, gstAmount]);

  const remainingDebit = useMemo(() => {
    if (!selectedBill) return 0;
    return Math.max(0, selectedBill.total - (selectedBill.debitedTotal ?? 0));
  }, [selectedBill]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [billRows, meta] = await Promise.all([
        fetchPurchaseBills(),
        fetchDebitNoteMeta(),
      ]);
      setBills(billRows);
      setReasons(meta.reasons);
      if (!purchaseBillId && billRows[0]) {
        setPurchaseBillId(billRows[0].id);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load purchase bills."));
    } finally {
      setLoading(false);
    }
  }, [purchaseBillId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseBillId) {
      setError("Select a purchase bill.");
      return;
    }
    if (total <= 0) {
      setError("Total must be greater than zero.");
      return;
    }
    if (total > remainingDebit + 0.01) {
      setError(`Debit amount exceeds remaining bill balance (${formatCurrency(remainingDebit)}).`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const note = await issueDebitNote({
        purchaseBillId,
        reason,
        reasonText: reason === "Other" ? reasonText : reasonText || undefined,
        subtotal: parseMoneyInput(subtotal),
        gstAmount: parseMoneyInput(gstAmount || "0"),
        total,
        entryVoucherId:
          reverseStock && selectedBill?.entryVoucherId
            ? selectedBill.entryVoucherId
            : undefined,
      });
      router.push(`/debit-notes/${note.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to issue debit note."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content max-w-3xl">
      <Link
        href="/purchase-bills"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to purchase bills
      </Link>

      <PageHeader title="Issue debit note" subtitle="Vendor return or billing correction" />

      {error ? (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="card-panel p-4 space-y-4">
        <div>
          <label className={labelClass}>Purchase bill</label>
          <select
            className={fieldClass}
            value={purchaseBillId}
            onChange={(e) => setPurchaseBillId(e.target.value)}
            required
          >
            <option value="">Select bill</option>
            {bills.map((bill) => (
              <option key={bill.id} value={bill.id}>
                {bill.billNo} · {bill.vendorName} · {formatCurrency(bill.total)}
              </option>
            ))}
          </select>
          {selectedBill ? (
            <p className="text-xs text-zinc-500 mt-1">
              Remaining debitable: {formatCurrency(remainingDebit)}
              {selectedBill.entryVoucherCode
                ? ` · Linked voucher ${selectedBill.entryVoucherCode}`
                : ""}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Subtotal</label>
            <input
              className={fieldClass}
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>GST amount</label>
            <input
              className={fieldClass}
              value={gstAmount}
              onChange={(e) => setGstAmount(e.target.value)}
            />
          </div>
        </div>

        <p className="text-sm">Total debit: <strong>{formatCurrency(total)}</strong></p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Reason</label>
            <select
              className={fieldClass}
              value={reason}
              onChange={(e) => setReason(e.target.value as DebitNoteReason)}
            >
              {reasons.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              {reason === "Other" ? "Reason details" : "Notes (optional)"}
            </label>
            <input
              className={fieldClass}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              required={reason === "Other"}
            />
          </div>
        </div>

        {selectedBill?.entryVoucherId ? (
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reverseStock}
              onChange={(e) => setReverseStock(e.target.checked)}
            />
            Reverse stock from linked entry voucher (removes returnable units)
          </label>
        ) : null}

        <div className="flex gap-3">
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? "Issuing…" : "Issue debit note"}
          </button>
          <Link href="/purchase-bills" className="row-action-btn">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
