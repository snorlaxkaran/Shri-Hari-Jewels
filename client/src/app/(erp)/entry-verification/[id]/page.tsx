"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import ItemCodeLink from "@/app/(components)/inventory/ItemCodeLink";
import StatusBadge from "@/app/(components)/StatusBadge";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteInventory } from "@/lib/auth/permissions";
import {
  fetchEntryVoucherById,
  updateEntryVoucherPrices,
  verifyEntryVoucher,
} from "@/lib/api/entry-vouchers";
import { getApiErrorMessage } from "@/lib/api/client";
import { useInventory } from "@/lib/inventory/inventory-context";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { EntryVoucherDetail } from "@/lib/types";

export default function EntryVoucherDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { refresh } = useInventory();
  const canManage = user ? canWriteInventory(user.role) : false;
  const voucherId = params.id;

  const [voucher, setVoucher] = useState<EntryVoucherDetail | null>(null);
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!voucherId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchEntryVoucherById(voucherId);
      setVoucher(data);
      setPriceDraft(
        Object.fromEntries(
          data.items.map((item) => [
            item.unitId,
            item.listPrice != null ? String(item.listPrice) : "",
          ]),
        ),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load voucher."));
      setVoucher(null);
    } finally {
      setLoading(false);
    }
  }, [voucherId]);

  useEffect(() => {
    void load();
  }, [load]);

  const missingPrices = useMemo(
    () =>
      voucher?.items.filter((item) => {
        const draft = priceDraft[item.unitId]?.trim();
        if (draft) {
          const value = Number(draft);
          return !Number.isFinite(value) || value <= 0;
        }
        return item.listPrice == null;
      }) ?? [],
    [voucher, priceDraft],
  );

  const handleSavePrices = async () => {
    if (!voucher) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const prices = voucher.items
        .map((item) => {
          const raw = priceDraft[item.unitId]?.trim();
          if (!raw) return null;
          const listPrice = Number(raw);
          if (!Number.isFinite(listPrice) || listPrice <= 0) {
            throw new Error(`Invalid price for ${item.itemCode}.`);
          }
          return { unitId: item.unitId, listPrice };
        })
        .filter((row): row is { unitId: string; listPrice: number } => row != null);

      const updated = await updateEntryVoucherPrices(voucher.id, prices);
      setVoucher(updated);
      setPriceDraft(
        Object.fromEntries(
          updated.items.map((item) => [
            item.unitId,
            item.listPrice != null ? String(item.listPrice) : "",
          ]),
        ),
      );
      setSuccess("Prices saved.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : getApiErrorMessage(err, "Failed to save prices."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!voucher) return;
    setVerifying(true);
    setError("");
    setSuccess("");
    try {
      if (missingPrices.length > 0) {
        setError(
          `Cannot verify: set a price for ${missingPrices
            .slice(0, 5)
            .map((item) => item.itemCode)
            .join(", ")}${missingPrices.length > 5 ? "…" : ""}.`,
        );
        return;
      }

      const prices = voucher.items.map((item) => {
        const raw = priceDraft[item.unitId]?.trim();
        const listPrice = raw ? Number(raw) : item.listPrice;
        if (listPrice == null || !Number.isFinite(listPrice) || listPrice <= 0) {
          throw new Error(`Invalid price for ${item.itemCode}.`);
        }
        return { unitId: item.unitId, listPrice };
      });

      await updateEntryVoucherPrices(voucher.id, prices);
      const updated = await verifyEntryVoucher(voucher.id);
      setVoucher(updated);
      await refresh({ silent: true });
      setSuccess("Voucher verified. Items are now live in stock.");
      setTimeout(() => router.push("/entry-verification"), 1200);
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to verify voucher.");
      const apiErr = err as { response?: { data?: { missingPrices?: string[] } } };
      const missing = apiErr.response?.data?.missingPrices;
      if (missing?.length) {
        setError(
          `Cannot verify until prices are set for: ${missing.slice(0, 5).join(", ")}${
            missing.length > 5 ? "…" : ""
          }`,
        );
      } else {
        setError(message);
      }
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-zinc-200 rounded" />
        <div className="h-64 bg-zinc-100 rounded-xl" />
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error || "Voucher not found."}
      </div>
    );
  }

  const isPending = voucher.status === "Pending";
  const focusPrices = searchParams.get("focus") === "prices";

  return (
    <div className="space-y-6 pb-10">
      <nav className="text-sm text-zinc-500 flex items-center gap-2">
        <Link href="/entry-verification" className="hover:text-zinc-800">
          Entry Verification
        </Link>
        <span>/</span>
        <span className="font-mono text-zinc-800">{voucher.voucherCode}</span>
      </nav>

      <div className="flex items-start gap-3">
        <Link
          href="/entry-verification"
          className="mt-1 rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold font-mono">{voucher.voucherCode}</h1>
            <StatusBadge status={isPending ? "Pending" : "Completed"} />
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            {formatDateTime(voucher.createdAt)} · {voucher.createdByName} ·{" "}
            {voucher.branchName}
          </p>
          {voucher.verifiedAt && (
            <p className="text-sm text-emerald-700 mt-1">
              Verified {formatDateTime(voucher.verifiedAt)} by{" "}
              {voucher.verifiedByName}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <section className="surface-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-800">
            Items ({voucher.itemCount})
          </h2>
          {isPending && canManage && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleSavePrices()}
                disabled={saving || verifying}
                className="btn-secondary px-3 py-2 text-sm"
              >
                {saving ? "Saving…" : "Save prices"}
              </button>
              <button
                type="button"
                onClick={() => void handleVerify()}
                disabled={saving || verifying}
                className="btn-primary px-3 py-2 text-sm inline-flex items-center gap-1.5"
              >
                <CheckCircle2 size={16} />
                {verifying ? "Verifying…" : "Verify voucher"}
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left text-zinc-500">
                <th className="px-5 py-3 font-medium">Item Code</th>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 font-medium">Metal</th>
                <th className="px-5 py-3 font-medium">Weight</th>
                <th className="px-5 py-3 font-medium">List price</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {voucher.items.map((item) => {
                const draft = priceDraft[item.unitId] ?? "";
                const missing =
                  !draft.trim() && item.listPrice == null;
                return (
                  <tr
                    key={item.unitId}
                    className={`border-t border-zinc-100 ${
                      missing ? "bg-amber-50/40" : ""
                    }`}
                  >
                    <td className="px-5 py-3">
                      <ItemCodeLink itemCode={item.itemCode} className="text-xs" />
                    </td>
                    <td className="px-5 py-3">{item.productName}</td>
                    <td className="px-5 py-3 font-mono text-xs">{item.sku}</td>
                    <td className="px-5 py-3">
                      {item.metal} {item.purity}
                    </td>
                    <td className="px-5 py-3">{item.weightGrams}g</td>
                    <td className="px-5 py-3">
                      {isPending && canManage ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={draft}
                          onChange={(e) =>
                            setPriceDraft((prev) => ({
                              ...prev,
                              [item.unitId]: e.target.value,
                            }))
                          }
                          autoFocus={focusPrices && missing}
                          placeholder="Enter price"
                          className={`input-field w-32 px-2 py-1.5 text-sm ${
                            missing ? "border-amber-300" : ""
                          }`}
                        />
                      ) : (
                        <span>
                          {item.listPrice != null
                            ? formatCurrency(item.listPrice)
                            : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isPending && missingPrices.length > 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {missingPrices.length} item(s) still need a list price before verification.
        </p>
      )}
    </div>
  );
}
