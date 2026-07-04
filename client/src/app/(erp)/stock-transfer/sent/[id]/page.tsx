"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, FileText, Mail, MapPin, Phone } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import CourierDetailsModal from "@/app/(components)/stock-transfer/CourierDetailsModal";
import TransferStatusBadge from "@/app/(components)/stock-transfer/TransferStatusBadge";
import { fetchStockTransferById } from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import type { StockTransfer } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

const labelClass =
  "text-[11px] font-medium uppercase tracking-wide text-zinc-400";

function ReadOnlyField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <p className="mt-1 text-sm text-zinc-900">{value?.trim() || "—"}</p>
    </div>
  );
}

export default function SentTransferDetailPage() {
  const params = useParams<{ id: string }>();
  const transferId = params.id;

  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const loadTransfer = useCallback(async () => {
    try {
      const data = await fetchStockTransferById(transferId);
      setTransfer(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load transfer."));
    } finally {
      setLoading(false);
    }
  }, [transferId]);

  useEffect(() => {
    loadTransfer();
  }, [loadTransfer]);

  const netWeight = useMemo(
    () =>
      transfer
        ? transfer.items
            .reduce((sum, item) => sum + (item.weightGrams ?? 0), 0)
            .toFixed(3) + " g"
        : "0.000 g",
    [transfer],
  );

  const handleShippingSaved = async (updated: StockTransfer) => {
    setTransfer(updated);
    setSuccess("Courier details saved successfully.");
    await loadTransfer();
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!transfer) {
    return (
      <div>
        <PageHeader title="Transfer Not Found" />
        {error && (
          <div className="px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  const customerLabel = transfer.customerBranchName
    ? `${transfer.customerBranchName}${
        transfer.customerName ? ` (${transfer.customerName})` : ""
      }`
    : transfer.toBranchName;

  return (
    <div>
      <PageHeader
        title={transfer.transferNo}
        subtitle={`${formatDate(transfer.transferDate)} · ${customerLabel}`}
        action={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <FileText size={16} />
            Save &amp; Generate Invoice
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-emerald-200 bg-emerald-50 text-emerald-700">
          {success}
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-4">
          <p className={labelClass}>Document Type</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {transfer.documentType}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className={labelClass}>Status</p>
          <div className="mt-1">
            <TransferStatusBadge status={transfer.status} />
          </div>
        </div>
        <div className="surface-card p-4">
          <p className={labelClass}>Created By</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {transfer.createdByName}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className={labelClass}>Total Value</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {formatCurrency(transfer.totalValue)}
          </p>
        </div>
      </div>

      <div className="surface-card overflow-hidden mb-5">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="border-b lg:border-b-0 lg:border-r border-zinc-100 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-zinc-100 p-2 text-zinc-600">
                <Building2 size={18} />
              </div>
              <div className="min-w-0">
                {transfer.customerName && (
                  <p className="text-xs text-zinc-500">{transfer.customerName}</p>
                )}
                <h3 className="text-base font-semibold text-zinc-900">
                  {transfer.customerBranchName ?? transfer.toBranchName}
                </h3>
                {transfer.recipientGstRegisteredName &&
                  transfer.recipientGstRegisteredName !==
                    transfer.customerBranchName && (
                    <p className="mt-1 text-xs text-zinc-500">
                      {transfer.recipientGstRegisteredName}
                    </p>
                  )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className={labelClass}>Mobile / Phone</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-zinc-900">
                  <Phone size={14} className="text-zinc-400 shrink-0" />
                  {transfer.recipientPhone?.trim() || "—"}
                </div>
              </div>
              <div>
                <p className={labelClass}>Address</p>
                <div className="mt-1 flex items-start gap-2 text-sm text-zinc-900">
                  <MapPin size={14} className="text-zinc-400 shrink-0 mt-0.5" />
                  <span>{transfer.recipientAddress?.trim() || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ReadOnlyField
              label="GSTN"
              value={transfer.recipientGstNumber}
            />
            <ReadOnlyField
              label="State Code"
              value={transfer.placeOfSupplyStateCode}
            />
            <ReadOnlyField label="PAN" value={transfer.recipientPanNumber} />
            <ReadOnlyField
              label="Email"
              value={transfer.recipientEmail}
            />

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-100">
              <div>
                <p className={labelClass}>Place of Supply</p>
                <p className="mt-1 text-sm text-zinc-900">
                  {transfer.placeOfSupplyState?.trim() || "—"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {transfer.placeOfSupplyStateCode?.trim() || "—"}
                </p>
              </div>
              <div>
                <p className={labelClass}>Place of Delivery</p>
                <p className="mt-1 text-sm text-zinc-900">
                  {transfer.placeOfDeliveryState?.trim() || "—"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {transfer.placeOfDeliveryStateCode?.trim() || "—"}
                </p>
              </div>
            </div>

            {transfer.recipientEmail && (
              <div className="sm:col-span-2 flex items-center gap-2 text-xs text-zinc-500">
                <Mail size={14} />
                Billing details captured at time of transfer
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-900">
            Transfer Items ({transfer.itemCount})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500">
                <th className="text-left px-5 py-3 font-medium">Item Code</th>
                <th className="text-left px-5 py-3 font-medium">Product</th>
                <th className="text-left px-5 py-3 font-medium">SKU</th>
                <th className="text-left px-5 py-3 font-medium">Metal/Purity</th>
                <th className="text-left px-5 py-3 font-medium">Weight (g)</th>
                <th className="text-left px-5 py-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {transfer.items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-zinc-100 text-zinc-900"
                >
                  <td className="px-5 py-3 font-mono text-xs">{item.itemCode}</td>
                  <td className="px-5 py-3">{item.productName}</td>
                  <td className="px-5 py-3 font-mono text-xs">{item.sku}</td>
                  <td className="px-5 py-3">
                    {item.metal} {item.purity}
                  </td>
                  <td className="px-5 py-3">
                    {item.weightGrams != null
                      ? item.weightGrams.toFixed(3)
                      : "—"}
                  </td>
                  <td className="px-5 py-3">{formatCurrency(item.price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50 font-medium text-zinc-900">
                <td colSpan={4} className="px-5 py-3 text-right text-sm">
                  Net Weight
                </td>
                <td className="px-5 py-3 text-sm">{netWeight}</td>
                <td className="px-5 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <CourierDetailsModal
        open={modalOpen}
        transfer={transfer}
        onClose={() => setModalOpen(false)}
        onSuccess={handleShippingSaved}
      />
    </div>
  );
}
