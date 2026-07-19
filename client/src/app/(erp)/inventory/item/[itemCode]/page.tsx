"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Package, Printer } from "lucide-react";
import {
  rowToBarcodeLabel,
  useBarcodeLabelPrint,
} from "@/app/(components)/inventory/BarcodeLabelPrint";
import StatusBadge from "@/app/(components)/StatusBadge";
import { fetchItemCodeHistory } from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import type { ItemCodeHistory, ItemCodeHistoryEvent } from "@/lib/types";

const EVENT_DOT: Record<ItemCodeHistoryEvent["type"], string> = {
  entry: "bg-emerald-500",
  transfer_out: "bg-violet-500",
  transfer_in: "bg-blue-500",
  transfer_return: "bg-amber-500",
  sale: "bg-zinc-800",
  status_change: "bg-sky-500",
  other: "bg-zinc-400",
};

function SpecSkeleton() {
  return (
    <div className="surface-card p-6 animate-pulse space-y-4">
      <div className="h-6 w-48 bg-zinc-200 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-16 bg-zinc-100 rounded" />
            <div className="h-4 w-24 bg-zinc-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="surface-card p-6 animate-pulse space-y-6">
      <div className="h-5 w-32 bg-zinc-200 rounded" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-3 w-3 rounded-full bg-zinc-200 mt-1" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-zinc-200 rounded" />
            <div className="h-3 w-64 bg-zinc-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineEvent({ event }: { event: ItemCodeHistoryEvent }) {
  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      <div className="flex flex-col items-center">
        <span
          className={`h-3 w-3 rounded-full ring-4 ring-white ${EVENT_DOT[event.type]}`}
        />
        <span className="w-px flex-1 bg-zinc-200 mt-2" aria-hidden />
      </div>
      <div className="flex-1 min-w-0 -mt-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-zinc-900">{event.title}</p>
          {event.reference && (
            <span className="font-mono text-xs text-zinc-500">{event.reference}</span>
          )}
        </div>
        {event.description && (
          <p className="text-sm text-zinc-600 mt-0.5">{event.description}</p>
        )}
        <p className="text-xs text-zinc-400 mt-1">
          {formatDateTime(event.date)} · {event.performedByName}
        </p>
      </div>
    </div>
  );
}

export default function ItemCodeHistoryPage() {
  const params = useParams<{ itemCode: string }>();
  const itemCode = decodeURIComponent(params.itemCode ?? "");
  const [history, setHistory] = useState<ItemCodeHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { printLabels, sheet: labelPrintSheet } = useBarcodeLabelPrint();

  const load = useCallback(async () => {
    if (!itemCode) return;
    setLoading(true);
    setError("");
    try {
      setHistory(await fetchItemCodeHistory(itemCode));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load item history."));
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }, [itemCode]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page-content max-w-4xl mx-auto space-y-6 pb-10">
      {labelPrintSheet}
      <nav className="text-sm text-zinc-500 flex items-center gap-2 flex-wrap">
        <Link href="/inventory" className="hover:text-zinc-800 transition-colors">
          Products
        </Link>
        <span>/</span>
        <span className="text-zinc-800 font-medium font-mono">{itemCode}</span>
      </nav>

      <div className="flex items-start gap-3">
        <Link
          href="/inventory"
          className="mt-1 rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-colors"
          aria-label="Back to inventory"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-zinc-900 font-mono">{itemCode}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Item lifecycle history</p>
        </div>
        {history && (
          <button
            type="button"
            className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm shrink-0"
            onClick={() =>
              printLabels([
                rowToBarcodeLabel({
                  itemCode,
                  name: history.spec.productName,
                  weightGrams: history.spec.weightGrams,
                  hallmarkNumber: history.spec.hallmarkNumber,
                }),
              ])
            }
          >
            <Printer size={16} />
            Print Label
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <>
          <SpecSkeleton />
          <TimelineSkeleton />
        </>
      )}

      {!loading && history && (
        <>
          <section className="surface-card p-6">
            <div className="flex flex-wrap items-start gap-4 justify-between mb-5">
              <div className="flex items-start gap-4 min-w-0">
                {history.spec.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={history.spec.imageUrl}
                    alt={history.spec.productName}
                    className="h-16 w-16 rounded-xl border object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <Package size={24} className="text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {history.spec.productName}
                  </h2>
                  <p className="text-sm text-zinc-500 font-mono mt-0.5">
                    {history.spec.sku}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={history.spec.status} />
                  </div>
                </div>
              </div>
              {history.spec.listPrice != null && (
                <div className="text-right">
                  <p className="text-xs text-zinc-500">List price</p>
                  <p className="text-lg font-semibold text-zinc-900">
                    {formatCurrency(history.spec.listPrice)}
                  </p>
                </div>
              )}
            </div>

            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Category</dt>
                <dd className="font-medium text-zinc-800">{history.spec.category}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Metal / Purity</dt>
                <dd className="font-medium text-zinc-800">
                  {history.spec.metal} · {history.spec.purity}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Weight</dt>
                <dd className="font-medium text-zinc-800">{history.spec.weightGrams}g</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Making charges</dt>
                <dd className="font-medium text-zinc-800">
                  {formatCurrency(history.spec.makingCharges)}
                </dd>
              </div>
              {history.spec.stoneCarat != null && (
                <div>
                  <dt className="text-xs text-zinc-500">Stone carat</dt>
                  <dd className="font-medium text-zinc-800">{history.spec.stoneCarat} ct</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-zinc-500">Location</dt>
                <dd className="font-medium text-zinc-800">{history.spec.branchName}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Added on</dt>
                <dd className="font-medium text-zinc-800">
                  {formatDate(history.spec.createdAt)}
                </dd>
              </div>
              {history.spec.productionRunNo && (
                <div>
                  <dt className="text-xs text-zinc-500">Production run</dt>
                  <dd className="font-medium text-zinc-800 font-mono text-xs">
                    {history.spec.productionRunNo}
                  </dd>
                </div>
              )}
              {history.spec.hallmarkNumber && (
                <div>
                  <dt className="text-xs text-zinc-500">Hallmark</dt>
                  <dd className="font-medium text-zinc-800">
                    {history.spec.hallmarkNumber}
                    {history.spec.hallmarkCenter
                      ? ` · ${history.spec.hallmarkCenter}`
                      : ""}
                  </dd>
                </div>
              )}
            </dl>

            {history.spec.designStones.length > 0 && (
              <div className="mt-5 pt-5 border-t border-zinc-100">
                <p className="text-xs font-medium text-zinc-500 mb-2">
                  Design stone requirements
                </p>
                {history.spec.designStonesNote && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                    {history.spec.designStonesNote}
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-zinc-500">
                        <th className="pb-2 pr-4 font-medium">Motif</th>
                        <th className="pb-2 pr-4 font-medium">Element</th>
                        <th className="pb-2 pr-4 font-medium">Stone</th>
                        <th className="pb-2 font-medium">Qty / piece</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.spec.designStones.map((stone, index) => (
                        <tr key={`${stone.motifName}-${stone.stoneType}-${index}`}>
                          <td className="py-1.5 pr-4 text-zinc-800">{stone.motifName}</td>
                          <td className="py-1.5 pr-4 text-zinc-600">{stone.elementName}</td>
                          <td className="py-1.5 pr-4 text-zinc-800">{stone.stoneType}</td>
                          <td className="py-1.5 text-zinc-800">{stone.qtyPerPiece}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {history.sale && (
              <div className="mt-5 pt-5 border-t border-zinc-100">
                <p className="text-xs font-medium text-zinc-500 mb-2">Sale record</p>
                <div className="rounded-lg bg-zinc-50 px-4 py-3 text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-zinc-500">Customer</p>
                    <p className="font-medium">{history.sale.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Deal price</p>
                    <p className="font-medium">{formatCurrency(history.sale.dealPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Invoice</p>
                    <p className="font-medium font-mono text-xs">
                      {history.sale.invoiceNo ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Sold on</p>
                    <p className="font-medium">{formatDate(history.sale.soldAt)}</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="surface-card p-6">
            <h2 className="text-sm font-semibold text-zinc-800 mb-6">Timeline</h2>
            {history.events.length === 0 ? (
              <p className="text-sm text-zinc-500">No lifecycle events recorded yet.</p>
            ) : (
              <div>
                {history.events.map((event) => (
                  <TimelineEvent key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
