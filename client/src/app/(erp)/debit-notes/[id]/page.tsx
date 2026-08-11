"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import { fetchDebitNoteById, fetchDebitNotePdfBlob } from "@/lib/api/debit-notes";
import { getApiErrorMessage } from "@/lib/api/client";
import { downloadPdfBlob } from "@/lib/open-pdf";
import type { DebitNote } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

export default function DebitNoteDetailPage() {
  const params = useParams<{ id: string }>();
  const [note, setNote] = useState<DebitNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError("");
    try {
      setNote(await fetchDebitNoteById(params.id));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load debit note."));
      setNote(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePdf = async () => {
    if (!note) return;
    setBusy(true);
    try {
      const blob = await fetchDebitNotePdfBlob(note.id);
      downloadPdfBlob(blob, `${note.debitNoteNo}.pdf`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not download PDF."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (!note) {
    return (
      <div className="page-content">
        <p className="text-sm text-red-600">{error || "Debit note not found."}</p>
      </div>
    );
  }

  return (
    <div className="page-content max-w-3xl">
      <Link
        href="/debit-notes"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to debit notes
      </Link>

      <PageHeader
        title={note.debitNoteNo}
        subtitle={`${note.vendorName ?? "Vendor"} · ${formatCurrency(note.total)}`}
        action={
          <button type="button" className="row-action-btn" disabled={busy} onClick={() => void handlePdf()}>
            <FileText className="h-4 w-4" />
            Download PDF
          </button>
        }
      />

      {error ? (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      ) : null}

      <section className="card-panel p-4 space-y-2 text-sm">
        <p>Purchase bill: {note.purchaseBillNo ?? note.purchaseBillId}</p>
        <p>Vendor: {note.vendorName ?? "—"}</p>
        <p>Reason: <StatusBadge status={note.reason} />{note.reasonText ? ` — ${note.reasonText}` : ""}</p>
        {note.entryVoucherCode ? <p>Entry voucher: {note.entryVoucherCode}</p> : null}
        <p>Subtotal: {formatCurrency(note.subtotal)} · GST: {formatCurrency(note.gstAmount)}</p>
        <p className="font-medium">Total debit: {formatCurrency(note.total)}</p>
        <p className="text-zinc-500">Issued {formatDate(note.createdAt)} by {note.createdByName}</p>
      </section>
    </div>
  );
}
