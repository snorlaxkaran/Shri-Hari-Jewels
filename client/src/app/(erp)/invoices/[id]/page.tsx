"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Copy,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import {
  cancelEInvoice,
  EINVOICE_CANCEL_REASONS,
  fetchEInvoiceForInvoice,
  generateEInvoice,
  type EInvoiceCancelReason,
  type EInvoiceRecord,
} from "@/lib/api/einvoice";
import { fetchInvoiceById, openInvoicePdf } from "@/lib/api/invoices";
import { getApiErrorMessage, api } from "@/lib/api/client";
import { preparePdfViewerTab } from "@/lib/open-pdf";
import type { Invoice } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

const fieldClass = "input-field w-full px-3 py-2 text-sm";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [eInvoice, setEInvoice] = useState<EInvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cancelReason, setCancelReason] = useState<EInvoiceCancelReason>("2");
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [qrBlobUrl, setQrBlobUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    setError("");
    try {
      const [invoiceData, eInvoiceData] = await Promise.all([
        fetchInvoiceById(invoiceId),
        fetchEInvoiceForInvoice(invoiceId),
      ]);
      setInvoice(invoiceData);
      setEInvoice(eInvoiceData);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load invoice."));
      setInvoice(null);
      setEInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (!eInvoice?.qrCodeData || !eInvoice.id) {
      setQrBlobUrl(null);
      return;
    }

    void api
      .get<Blob>(`/api/einvoice/records/${eInvoice.id}/qr.png`, {
        responseType: "blob",
      })
      .then((response) => {
        objectUrl = URL.createObjectURL(response.data);
        setQrBlobUrl(objectUrl);
      })
      .catch(() => {
        setQrBlobUrl(null);
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [eInvoice?.id, eInvoice?.qrCodeData]);

  const canCancel = useMemo(() => {
    if (!eInvoice || eInvoice.status !== "Generated" || !eInvoice.ackDate) {
      return false;
    }
    const ackTime = new Date(eInvoice.ackDate).getTime();
    return Date.now() - ackTime <= 24 * 60 * 60 * 1000;
  }, [eInvoice]);

  const copyIrn = async () => {
    if (!eInvoice?.irn) return;
    await navigator.clipboard.writeText(eInvoice.irn);
    setSuccess("IRN copied to clipboard.");
  };

  const handleGenerate = async (force = false) => {
    if (!invoice) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const record = await generateEInvoice({
        invoiceId: invoice.id,
        force,
      });
      setEInvoice(record);
      if (record.status === "Failed") {
        setError(record.errorMessage ?? "e-Invoice generation failed.");
      } else if (record.status === "Skipped") {
        setSuccess(record.errorMessage ?? "e-Invoice skipped.");
      } else {
        setSuccess("e-Invoice generated successfully.");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not generate e-Invoice."));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!eInvoice) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const record = await cancelEInvoice({
        recordId: eInvoice.id,
        reason: cancelReason,
        remarks: cancelRemarks,
      });
      setEInvoice(record);
      setSuccess("e-Invoice cancelled on IRP.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not cancel e-Invoice."));
    } finally {
      setBusy(false);
    }
  };

  const handleOpenPdf = () => {
    if (!invoice) return;
    const tab = preparePdfViewerTab();
    void openInvoicePdf(invoice.id, `${invoice.invoiceNo}.pdf`, tab).catch((err) => {
      tab?.close();
      setError(getApiErrorMessage(err, "Could not open invoice PDF."));
    });
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
    <div className="page-content max-w-5xl">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to invoices
      </Link>

      <PageHeader
        title={invoice.invoiceNo}
        subtitle={`${invoice.customerName} · ${formatCurrency(invoice.total)}`}
        action={
          <button type="button" className="row-action-btn" onClick={handleOpenPdf}>
            <FileText className="h-4 w-4" />
            View PDF
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-emerald-200 bg-emerald-50 text-emerald-800">
          {success}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold mb-3">Invoice details</h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-zinc-500">Customer</dt>
                <dd>{invoice.customerName}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Mobile</dt>
                <dd>{invoice.customerMobile}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Date</dt>
                <dd>{formatDate(invoice.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Payment</dt>
                <dd>{invoice.paymentMode}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Taxable value</dt>
                <dd>{formatCurrency(invoice.taxableValue)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Total</dt>
                <dd className="font-medium">{formatCurrency(invoice.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold mb-3">Line items</h2>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>HSN</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <p>{item.productName}</p>
                        <p className="text-xs text-zinc-500">{item.itemCode}</p>
                      </td>
                      <td className="td-muted">{item.hsnCode ?? "—"}</td>
                      <td className="td-num">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="surface-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold">GST e-Invoice</h2>
            </div>

            <div className="mb-4">
              <StatusBadge
                status={eInvoice?.status ?? "Not started"}
              />
            </div>

            {eInvoice?.irn ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-zinc-500 mb-1">IRN</p>
                  <div className="flex items-start gap-2">
                    <code className="text-xs break-all bg-zinc-50 border rounded px-2 py-1 flex-1">
                      {eInvoice.irn}
                    </code>
                    <button
                      type="button"
                      className="row-action-btn shrink-0"
                      onClick={() => void copyIrn()}
                      aria-label="Copy IRN"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {eInvoice.ackNo ? (
                  <p>
                    <span className="text-zinc-500">Ack No:</span> {eInvoice.ackNo}
                  </p>
                ) : null}
                {eInvoice.ackDate ? (
                  <p>
                    <span className="text-zinc-500">Ack Date:</span>{" "}
                    {formatDateTime(eInvoice.ackDate)}
                  </p>
                ) : null}
                {qrBlobUrl ? (
                  <div>
                    <p className="text-zinc-500 mb-2">Signed QR</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrBlobUrl}
                      alt="e-Invoice QR code"
                      className="w-40 h-40 border rounded bg-white"
                    />
                  </div>
                ) : null}
              </div>
            ) : eInvoice?.errorMessage ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded px-3 py-2">
                {eInvoice.errorMessage}
              </p>
            ) : (
              <p className="text-sm text-zinc-500">
                Generate an IRN via NIC IRP for eligible B2B invoices.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              {(eInvoice?.status === "Failed" ||
                eInvoice?.status === "Skipped" ||
                !eInvoice ||
                eInvoice.status === "Pending") && (
                <button
                  type="button"
                  className="row-action-btn justify-center w-full"
                  disabled={busy}
                  onClick={() => void handleGenerate(Boolean(eInvoice))}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {eInvoice?.status === "Failed" ? "Retry generation" : "Generate e-Invoice"}
                </button>
              )}

              {eInvoice?.status === "Generated" && canCancel ? (
                <div className="pt-3 border-t space-y-2">
                  <label className="labelClass">Cancel reason</label>
                  <select
                    className={fieldClass}
                    value={cancelReason}
                    onChange={(e) =>
                      setCancelReason(e.target.value as EInvoiceCancelReason)
                    }
                  >
                    {EINVOICE_CANCEL_REASONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={fieldClass}
                    placeholder="Remarks (optional)"
                    value={cancelRemarks}
                    onChange={(e) => setCancelRemarks(e.target.value)}
                  />
                  <button
                    type="button"
                    className="row-action-btn justify-center w-full text-red-700 border-red-200"
                    disabled={busy}
                    onClick={() => void handleCancel()}
                  >
                    Cancel e-Invoice (24h window)
                  </button>
                </div>
              ) : null}

              {eInvoice?.status === "Generated" && !canCancel ? (
                <p className="text-xs text-zinc-500 pt-2 border-t">
                  The 24-hour IRP cancellation window has passed. Issue a credit note
                  instead.
                </p>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
