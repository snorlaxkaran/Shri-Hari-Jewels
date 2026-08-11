"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import {
  fetchCreditNoteById,
  fetchCreditNotePdfBlob,
} from "@/lib/api/credit-notes";
import { getApiErrorMessage } from "@/lib/api/client";
import { downloadPdfBlob } from "@/lib/open-pdf";
import type { CreditNote } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

export default function CreditNoteDetailPage() {
  const params = useParams<{ id: string }>();
  const [note, setNote] = useState<CreditNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError("");
    try {
      setNote(await fetchCreditNoteById(params.id));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load credit note."));
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
      const blob = await fetchCreditNotePdfBlob(note.id);
      downloadPdfBlob(blob, `${note.creditNoteNo}.pdf`);
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
        <p className="text-sm text-red-600">{error || "Credit note not found."}</p>
      </div>
    );
  }

  return (
    <div className="page-content max-w-5xl">
      <Link
        href="/credit-notes"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to credit notes
      </Link>

      <PageHeader
        title={note.creditNoteNo}
        subtitle={`${note.customerName} · ${formatCurrency(note.total)}`}
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

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card-panel p-4 space-y-2 text-sm">
          <h2 className="font-medium text-zinc-900">Details</h2>
          <p>Invoice: {note.invoiceNo ? (
            <Link href={`/invoices/${note.invoiceId}`} className="text-blue-600 hover:underline">
              {note.invoiceNo}
            </Link>
          ) : "—"}</p>
          <p>Reason: {note.reason}{note.reasonText ? ` — ${note.reasonText}` : ""}</p>
          <p>Refund: <StatusBadge status={note.refundMode} />{note.refundRef ? ` (${note.refundRef})` : ""}</p>
          <p>Issued: {formatDate(note.createdAt)} by {note.createdByName}</p>
        </section>

        <section className="card-panel p-4 space-y-2 text-sm">
          <h2 className="font-medium text-zinc-900">Amounts</h2>
          <p>Taxable: {formatCurrency(note.taxableValue)}</p>
          <p>CGST: {formatCurrency(note.cgst)} · SGST: {formatCurrency(note.sgst)} · IGST: {formatCurrency(note.igst)}</p>
          <p className="font-medium">Total credit: {formatCurrency(note.total)}</p>
        </section>
      </div>

      <section className="card-panel p-4 mt-4">
        <h2 className="font-medium text-zinc-900 mb-3">Line items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Metal</th>
                <th className="py-2 pr-4 text-right">Credit amount</th>
                <th className="py-2">Return stock</th>
              </tr>
            </thead>
            <tbody>
              {note.items.map((item) => (
                <tr key={item.id} className="border-t border-zinc-100">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-zinc-500">{item.itemCode}</div>
                  </td>
                  <td className="py-2 pr-4">{item.metal}</td>
                  <td className="py-2 pr-4 text-right">{formatCurrency(item.amount)}</td>
                  <td className="py-2">{item.returnStock ? "Yes (QC gate)" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
