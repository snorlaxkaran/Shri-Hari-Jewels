"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Calendar, ScanLine, Trash2 } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import TransferTabs from "@/app/(components)/stock-transfer/TransferTabs";
import { fetchBranches } from "@/lib/api/branches";
import { createStockTransfer } from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import { useInventory } from "@/lib/inventory/inventory-context";
import type {
  Branch,
  InventoryItem,
  InventoryUnit,
  StockTransferDocumentType,
} from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type ScannedItem = {
  unit: InventoryUnit;
  product: InventoryItem;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function StockTransferScanPage() {
  const { items, hydrated, loading, refresh } = useInventory();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [toBranchId, setToBranchId] = useState("");
  const [transferDate, setTransferDate] = useState(today());
  const [docType, setDocType] =
    useState<StockTransferDocumentType>("Wholesale GST Invoice");
  const [barcode, setBarcode] = useState("");
  const [scanned, setScanned] = useState<ScannedItem[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<React.ReactNode>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBranches()
      .then((data) =>
        setBranches(
          data.filter((branch) => branch.active && branch.id !== "head-office"),
        ),
      )
      .catch((err) => setError(getApiErrorMessage(err, "Could not load stores.")));
  }, []);

  const allUnits = useMemo(
    () =>
      items.flatMap((product) =>
        product.units.map((unit) => ({
          unit,
          product,
        })),
      ),
    [items],
  );

  const totalValue = scanned.reduce(
    (sum, item) => sum + item.product.price,
    0,
  );

  const addBarcode = () => {
    const code = barcode.trim();
    if (!code) return;

    setError("");
    setSuccess("");

    if (scanned.some((item) => item.unit.itemCode === code)) {
      setError("This item is already added.");
      return;
    }

    const found = allUnits.find((item) => item.unit.itemCode === code);
    if (!found) {
      setError("Item code not found in admin stock.");
      return;
    }

    if (found.unit.status !== "Available") {
      setError(`This item is ${found.unit.status} and cannot be transferred.`);
      return;
    }

    setScanned((prev) => [...prev, found]);
    setBarcode("");
  };

  const removeItem = (itemCode: string) => {
    setScanned((prev) => prev.filter((item) => item.unit.itemCode !== itemCode));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!toBranchId) {
      setError("Select a store first.");
      return;
    }
    if (scanned.length === 0) {
      setError("Scan at least one item.");
      return;
    }

    setSaving(true);
    try {
      const result = await createStockTransfer({
        toBranchId,
        documentType: docType,
        transferDate,
        itemCodes: scanned.map((item) => item.unit.itemCode),
      });
      await refresh({ silent: true });
      setSuccess(
        <>
          {result.transfer.transferNo} saved for {scanned.length} item
          {scanned.length === 1 ? "" : "s"}.{" "}
          <Link
            href="/stock-transfer/sent"
            className="font-medium underline underline-offset-2"
          >
            View sent list
          </Link>
        </>,
      );
      setScanned([]);
      setBarcode("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save transfer."));
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Scan & Send"
        subtitle="Scan item tags and send stock from admin to a store"
      />

      <TransferTabs />

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

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
        <div className="surface-card p-5 space-y-4">
          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Store
            </label>
            <select
              value={toBranchId}
              onChange={(event) => setToBranchId(event.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
            >
              <option value="">Select store</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Date
            </label>
            <div className="relative">
              <Calendar
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="date"
                value={transferDate}
                onChange={(event) => setTransferDate(event.target.value)}
                className="input-field w-full pl-9 pr-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Document Type
            </label>
            <div className="grid grid-cols-1 gap-2">
              {(["Wholesale GST Invoice", "Delivery Challan"] as const).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDocType(type)}
                    className={`tab-btn text-left ${
                      docType === type ? "tab-btn-active" : "tab-btn-inactive"
                    }`}
                  >
                    {type}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100">
            <p className="text-xs text-zinc-500">Items to send</p>
            <p className="text-2xl font-semibold text-zinc-900">
              {scanned.length}
            </p>
            <p className="text-sm text-zinc-500">{formatCurrency(totalValue)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Scan or enter barcode tag
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  value={barcode}
                  onChange={(event) => {
                    setBarcode(event.target.value);
                    setError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addBarcode();
                    }
                  }}
                  placeholder="Scan item code"
                  className="input-field w-full pl-9 pr-4 py-2 text-sm"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={addBarcode}
                disabled={!barcode.trim()}
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">
                Scanned Items
              </h2>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !toBranchId || scanned.length === 0}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
              >
                <ArrowRightLeft size={16} />
                {saving ? "Saving..." : "Send to Store"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500">
                    <th className="text-left px-5 py-3 font-medium">Item Code</th>
                    <th className="text-left px-5 py-3 font-medium">Product</th>
                    <th className="text-left px-5 py-3 font-medium">SKU</th>
                    <th className="text-left px-5 py-3 font-medium">Metal</th>
                    <th className="text-left px-5 py-3 font-medium">Price</th>
                    <th className="text-left px-5 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scanned.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm text-zinc-400"
                      >
                        Scan barcode tags to add items for transfer.
                      </td>
                    </tr>
                  ) : (
                    scanned.map(({ unit, product }) => (
                      <tr
                        key={unit.id}
                        className="border-t border-zinc-100 text-zinc-900"
                      >
                        <td className="px-5 py-3 font-mono text-xs">
                          {unit.itemCode}
                        </td>
                        <td className="px-5 py-3">{product.name}</td>
                        <td className="px-5 py-3 font-mono text-xs">
                          {product.sku}
                        </td>
                        <td className="px-5 py-3">
                          {product.metal} {product.purity}
                        </td>
                        <td className="px-5 py-3">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => removeItem(unit.itemCode)}
                            className="p-1 text-zinc-400 hover:text-red-600"
                            aria-label={`Remove ${unit.itemCode}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
