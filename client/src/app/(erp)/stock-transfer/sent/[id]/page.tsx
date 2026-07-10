"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, FileText, Loader2 } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import TransferStatusBadge from "@/app/(components)/stock-transfer/TransferStatusBadge";
import {
  fetchStockTransferById,
  generateTransferInvoice,
} from "@/lib/api/inventory";
import { fetchSettings } from "@/lib/api/settings";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ShopSettings, StockTransfer, StockTransferItem } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import ItemCodeLink from "@/app/(components)/inventory/ItemCodeLink";

const labelClass =
  "text-[11px] font-medium uppercase tracking-wide text-zinc-400";
const inputClass = "input-field w-full px-3 py-2 text-sm";

const today = () => new Date().toISOString().slice(0, 10);

type JewelryGroupKey = "Gold Jewelry" | "Silver Jewelry" | "Imitation Jewelry";

const resolveJewelryGroup = (metal: string): JewelryGroupKey => {
  if (metal === "Gold" || metal === "Rose Gold") return "Gold Jewelry";
  if (metal === "Silver" || metal === "Platinum") return "Silver Jewelry";
  return "Imitation Jewelry";
};

const GROUP_ORDER: JewelryGroupKey[] = [
  "Gold Jewelry",
  "Silver Jewelry",
  "Imitation Jewelry",
];

const groupItems = (items: StockTransferItem[]) => {
  const grouped = new Map<JewelryGroupKey, { pieces: number; amount: number }>();
  for (const key of GROUP_ORDER) {
    grouped.set(key, { pieces: 0, amount: 0 });
  }
  for (const item of items) {
    const key = resolveJewelryGroup(item.metal);
    const entry = grouped.get(key)!;
    entry.pieces += 1;
    entry.amount += item.price;
  }
  return grouped;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

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
  const router = useRouter();
  const transferId = params.id;

  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [redirectMessage, setRedirectMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const [contactPersonName, setContactPersonName] = useState("");
  const [contactPersonPhone, setContactPersonPhone] = useState("");
  const [courierCompany, setCourierCompany] = useState("");
  const [dispatchDate, setDispatchDate] = useState(today());

  const loadTransfer = useCallback(async () => {
    try {
      const [data, settings] = await Promise.all([
        fetchStockTransferById(transferId),
        fetchSettings(),
      ]);
      setTransfer(data);
      setShopSettings(settings);
      setContactPersonName(data.contactPersonName ?? "");
      setContactPersonPhone(data.contactPersonPhone ?? "");
      setCourierCompany(data.courierCompany ?? "");
      setDispatchDate(
        data.dispatchDate ? data.dispatchDate.slice(0, 10) : today(),
      );
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
        ? transfer.items.reduce((sum, item) => sum + (item.weightGrams ?? 0), 0)
        : 0,
    [transfer],
  );

  const totalPrice = useMemo(
    () => transfer?.items.reduce((sum, item) => sum + item.price, 0) ?? 0,
    [transfer],
  );

  const groupedSummary = useMemo(
    () => (transfer ? groupItems(transfer.items) : null),
    [transfer],
  );

  const gstPreview = useMemo(() => {
    if (!transfer || transfer.documentType !== "Wholesale GST Invoice") {
      return null;
    }
    const supplyState = transfer.placeOfSupplyState?.trim().toLowerCase() ?? "";
    const sellerState = shopSettings?.state?.trim().toLowerCase() ?? "";
    const isIntraState =
      supplyState.length > 0 && supplyState === sellerState;
    if (isIntraState) {
      const cgst = totalPrice * 0.015;
      const sgst = totalPrice * 0.015;
      return {
        label: `CGST 1.5% + SGST 1.5% = ${formatCurrency(cgst + sgst)}`,
        grandTotal: totalPrice + cgst + sgst,
      };
    }
    const igst = totalPrice * 0.03;
    return {
      label: `IGST 3% = ${formatCurrency(igst)}`,
      grandTotal: totalPrice + igst,
    };
  }, [transfer, shopSettings, totalPrice]);

  const isInvoice = transfer?.documentType === "Wholesale GST Invoice";
  const docLabel = isInvoice ? "Invoice" : "Challan";
  const pdfFilename = transfer
    ? isInvoice
      ? `invoice-${transfer.invoiceNo ?? transfer.transferNo}.pdf`
      : `challan-${transfer.transferNo}.pdf`
    : "document.pdf";

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transfer) return;

    setFormError("");
    setRedirectMessage("");

    if (!contactPersonName.trim()) {
      setFormError("Contact person name is required.");
      return;
    }
    if (!contactPersonPhone.trim()) {
      setFormError("Contact person phone is required.");
      return;
    }
    if (!courierCompany.trim()) {
      setFormError("Courier company is required.");
      return;
    }
    if (!dispatchDate) {
      setFormError("Dispatch date is required.");
      return;
    }

    setGenerating(true);
    try {
      const formData = {
        contactPersonName: contactPersonName.trim(),
        contactPersonPhone: contactPersonPhone.trim(),
        courierCompany: courierCompany.trim(),
        dispatchDate,
      };
      const result = await generateTransferInvoice(transfer.id, formData);
      setTransfer(result.transfer);
      setPdfBlob(result.pdfBlob);
      downloadBlob(result.pdfBlob, pdfFilename);
      setRedirectMessage(
        "Invoice generated. Redirecting to Proforma List...",
      );
      setTimeout(() => router.push("/stock-transfer/proforma"), 1500);
    } catch (err) {
      setFormError(getApiErrorMessage(err, `Failed to generate ${docLabel.toLowerCase()}.`));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadAgain = () => {
    if (pdfBlob) {
      downloadBlob(pdfBlob, pdfFilename);
    }
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
        title={`Transfer ${transfer.transferNo}`}
        subtitle={`${transfer.documentType} · ${transfer.itemCount} items · ${formatCurrency(transfer.totalValue)}`}
        action={
          transfer.invoiceNo || transfer.invoicedAt ? (
            <button
              type="button"
              onClick={handleDownloadAgain}
              disabled={!pdfBlob}
              className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
            >
              <Download size={16} />
              Download {docLabel}
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {redirectMessage && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-emerald-200 bg-emerald-50 text-emerald-700">
          {redirectMessage}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <TransferStatusBadge status={transfer.status} />
      </div>

      <div className="surface-card p-5 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReadOnlyField label="Customer" value={transfer.customerName} />
          <ReadOnlyField label="Branch" value={customerLabel} />
          <ReadOnlyField
            label="Date"
            value={formatDate(transfer.transferDate)}
          />
          <ReadOnlyField label="Document Type" value={transfer.documentType} />
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ReadOnlyField label="Created By" value={transfer.createdByName} />
          <ReadOnlyField label="Transfer No" value={transfer.transferNo} />
          <ReadOnlyField
            label="Invoice No"
            value={transfer.invoiceNo ?? "—"}
          />
        </div>
      </div>

      <div className="surface-card p-5 mb-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">
          Recipient / Billing Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ReadOnlyField label="GSTN" value={transfer.recipientGstNumber} />
          <ReadOnlyField label="PAN" value={transfer.recipientPanNumber} />
          <ReadOnlyField label="Address" value={transfer.recipientAddress} />
          <ReadOnlyField
            label="Place of Supply"
            value={
              transfer.placeOfSupplyState
                ? `${transfer.placeOfSupplyState}${transfer.placeOfSupplyStateCode ? ` (${transfer.placeOfSupplyStateCode})` : ""}`
                : undefined
            }
          />
          <ReadOnlyField
            label="Place of Delivery"
            value={
              transfer.placeOfDeliveryState
                ? `${transfer.placeOfDeliveryState}${transfer.placeOfDeliveryStateCode ? ` (${transfer.placeOfDeliveryStateCode})` : ""}`
                : undefined
            }
          />
        </div>
      </div>

      <div className="surface-card overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-900">
            Items ({transfer.itemCount})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500">
                <th className="text-left px-5 py-3 font-medium w-10">#</th>
                <th className="text-left px-5 py-3 font-medium">Item Code</th>
                <th className="text-left px-5 py-3 font-medium">Product</th>
                <th className="text-left px-5 py-3 font-medium">SKU</th>
                <th className="text-left px-5 py-3 font-medium">Metal</th>
                <th className="text-left px-5 py-3 font-medium">Purity</th>
                <th className="text-left px-5 py-3 font-medium">Weight (g)</th>
                <th className="text-left px-5 py-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {transfer.items.map((item, index) => (
                <tr
                  key={item.id}
                  className="border-t border-zinc-100 text-zinc-900"
                >
                  <td className="px-5 py-3 text-zinc-500">{index + 1}</td>
                  <td className="px-5 py-3 font-mono text-xs">
                    <ItemCodeLink itemCode={item.itemCode} className="text-xs" />
                  </td>
                  <td className="px-5 py-3">{item.productName}</td>
                  <td className="px-5 py-3 font-mono text-xs">{item.sku}</td>
                  <td className="px-5 py-3">{item.metal}</td>
                  <td className="px-5 py-3">{item.purity}</td>
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
                <td colSpan={6} className="px-5 py-3 text-right text-sm">
                  Total
                </td>
                <td className="px-5 py-3 text-sm">{netWeight.toFixed(3)}g</td>
                <td className="px-5 py-3 text-sm">
                  {formatCurrency(totalPrice)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {groupedSummary && (
          <div className="px-5 py-4 border-t border-zinc-100 space-y-2">
            <p className={labelClass}>Grouped Summary</p>
            {GROUP_ORDER.map((groupName) => {
              const group = groupedSummary.get(groupName)!;
              if (group.pieces === 0) return null;
              return (
                <p key={groupName} className="text-sm text-zinc-800">
                  <span className="font-medium">{groupName}</span>
                  {" — "}
                  {group.pieces} pcs — {formatCurrency(group.amount)}
                </p>
              );
            })}
          </div>
        )}

        {gstPreview && (
          <div className="px-5 py-4 border-t border-zinc-100 bg-zinc-50/50">
            <p className="text-sm text-zinc-700">{gstPreview.label}</p>
            <p className="text-sm font-semibold text-zinc-900 mt-1">
              Grand Total: {formatCurrency(gstPreview.grandTotal)}
            </p>
          </div>
        )}
      </div>

      <div className="surface-card p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">
          Courier &amp; Dispatch Details
        </h2>

        {transfer.invoicedAt && !pdfBlob && (
          <p className="mb-4 text-sm text-zinc-600">
            This transfer was invoiced on {formatDate(transfer.invoicedAt)}.
            Fill in courier details and generate again to download the PDF.
          </p>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact Person Name *</label>
              <input
                type="text"
                value={contactPersonName}
                onChange={(event) => setContactPersonName(event.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contact Person Phone *</label>
              <input
                type="tel"
                value={contactPersonPhone}
                onChange={(event) => setContactPersonPhone(event.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Courier Company *</label>
              <input
                type="text"
                value={courierCompany}
                onChange={(event) => setCourierCompany(event.target.value)}
                required
                placeholder="Blue Dart, DTDC, FedEx..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Dispatch Date *</label>
              <input
                type="date"
                value={dispatchDate}
                onChange={(event) => setDispatchDate(event.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Net Weight</label>
              <input
                type="text"
                value={`${netWeight.toFixed(3)} g`}
                readOnly
                className={`${inputClass} bg-zinc-50 text-zinc-600`}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
            {transfer.invoicedAt && pdfBlob && (
              <button
                type="button"
                onClick={handleDownloadAgain}
                className="btn-secondary flex items-center justify-center gap-2 px-4 py-2 text-sm"
              >
                <Download size={16} />
                Re-download {docLabel}
              </button>
            )}
            <button
              type="submit"
              disabled={generating}
              className="btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Save &amp; Generate {docLabel}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
