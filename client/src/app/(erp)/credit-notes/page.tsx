"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import ListPageShell from "@/app/(components)/ListPageShell";
import StatusBadge from "@/app/(components)/StatusBadge";
import { fetchCreditNotes, fetchCreditNotePdfBlob } from "@/lib/api/credit-notes";
import { getApiErrorMessage } from "@/lib/api/client";
import { downloadPdfBlob } from "@/lib/open-pdf";
import type { CreditNote } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

export default function CreditNotesPage() {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    fetchCreditNotes()
      .then(setNotes)
      .catch((err) => setError(getApiErrorMessage(err, "Could not load credit notes.")))
      .finally(() => setLoading(false));
  }, []);

  const handlePdf = async (note: CreditNote) => {
    setOpeningId(note.id);
    setError("");
    try {
      const blob = await fetchCreditNotePdfBlob(note.id);
      downloadPdfBlob(blob, `${note.creditNoteNo}.pdf`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not download credit note PDF."));
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <ListPageShell
      title="Credit notes"
      subtitle="Sales returns and invoice corrections"
      loading={loading}
      error={error}
    >
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Note No</th>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Refund</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note) => (
              <tr key={note.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <Link href={`/credit-notes/${note.id}`} className="font-medium hover:underline">
                    {note.creditNoteNo}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {note.invoiceNo ? (
                    <Link href={`/invoices/${note.invoiceId}`} className="hover:underline">
                      {note.invoiceNo}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">{note.customerName}</td>
                <td className="px-4 py-3">{note.reason}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={note.refundMode} />
                </td>
                <td className="px-4 py-3 text-right">{formatCurrency(note.total)}</td>
                <td className="px-4 py-3">{formatDate(note.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="row-action-btn"
                    disabled={openingId === note.id}
                    onClick={() => void handlePdf(note)}
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </button>
                </td>
              </tr>
            ))}
            {!loading && notes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  No credit notes yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </ListPageShell>
  );
}
