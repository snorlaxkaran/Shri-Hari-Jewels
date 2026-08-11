"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import ListPageShell from "@/app/(components)/ListPageShell";
import StatusBadge from "@/app/(components)/StatusBadge";
import { fetchDebitNotes, fetchDebitNotePdfBlob } from "@/lib/api/debit-notes";
import { getApiErrorMessage } from "@/lib/api/client";
import { downloadPdfBlob } from "@/lib/open-pdf";
import type { DebitNote } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

export default function DebitNotesPage() {
  const [notes, setNotes] = useState<DebitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    fetchDebitNotes()
      .then(setNotes)
      .catch((err) => setError(getApiErrorMessage(err, "Could not load debit notes.")))
      .finally(() => setLoading(false));
  }, []);

  const handlePdf = async (note: DebitNote) => {
    setOpeningId(note.id);
    setError("");
    try {
      const blob = await fetchDebitNotePdfBlob(note.id);
      downloadPdfBlob(blob, `${note.debitNoteNo}.pdf`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not download debit note PDF."));
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <ListPageShell
      title="Debit notes"
      subtitle="Purchase returns and vendor billing corrections"
      loading={loading}
      error={error}
    >
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Note No</th>
              <th className="px-4 py-3 font-medium">Bill</th>
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note) => (
              <tr key={note.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <Link href={`/debit-notes/${note.id}`} className="font-medium hover:underline">
                    {note.debitNoteNo}
                  </Link>
                </td>
                <td className="px-4 py-3">{note.purchaseBillNo ?? "—"}</td>
                <td className="px-4 py-3">{note.vendorName ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={note.reason} />
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
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No debit notes yet. Issue one from a purchase bill.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </ListPageShell>
  );
}
