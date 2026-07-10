"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ClipboardCheck,
  IndianRupee,
  Pencil,
  Trash2,
} from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteInventory } from "@/lib/auth/permissions";
import {
  deleteEntryVoucher,
  fetchEntryVouchers,
} from "@/lib/api/entry-vouchers";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import type { EntryVoucher, EntryVoucherStatus } from "@/lib/types";

type Tab = EntryVoucherStatus;

export default function EntryVerificationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user ? canWriteInventory(user.role) : false;
  const [tab, setTab] = useState<Tab>("Pending");
  const [vouchers, setVouchers] = useState<EntryVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setVouchers(await fetchEntryVouchers(tab));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load vouchers."));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (voucher: EntryVoucher) => {
    if (
      !window.confirm(
        `Delete voucher ${voucher.voucherCode} and all ${voucher.itemCount} inactive item(s)? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletingId(voucher.id);
    setError("");
    try {
      await deleteEntryVoucher(voucher.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete voucher."));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && vouchers.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entry Verification"
        subtitle="Review bulk stock entries before they become live inventory"
      />

      <div className="flex gap-2">
        {(["Pending", "Verified"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setTab(status)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === status
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {status === "Pending" ? "Pending" : "Verified"}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="surface-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left text-zinc-500">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Voucher ID</th>
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Items</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {canManage && tab === "Pending" && (
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage && tab === "Pending" ? 6 : 5}
                    className="px-5 py-10 text-center text-zinc-400"
                  >
                    {tab === "Pending"
                      ? "No vouchers awaiting verification."
                      : "No verified vouchers yet."}
                  </td>
                </tr>
              ) : (
                vouchers.map((voucher) => (
                  <tr
                    key={voucher.id}
                    className="border-t border-zinc-100 hover:bg-zinc-50/80"
                  >
                    <td className="px-5 py-3 text-zinc-700">
                      {formatDateTime(voucher.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/entry-verification/${voucher.id}`}
                        className="font-mono text-sm font-medium text-blue-700 hover:underline"
                      >
                        {voucher.voucherCode}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-zinc-700">
                      {voucher.createdByName}
                    </td>
                    <td className="px-5 py-3 text-zinc-700">
                      {voucher.pricedItemCount}/{voucher.itemCount} priced
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={
                          voucher.status === "Pending" ? "Pending" : "Completed"
                        }
                      />
                    </td>
                    {canManage && tab === "Pending" && (
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/entry-verification/${voucher.id}`)
                            }
                            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                            title="Edit voucher items"
                            aria-label={`Edit ${voucher.voucherCode}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/entry-verification/${voucher.id}?focus=prices`,
                              )
                            }
                            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                            title="Update prices"
                            aria-label={`Update prices for ${voucher.voucherCode}`}
                          >
                            <IndianRupee size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(voucher)}
                            disabled={deletingId === voucher.id}
                            className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Delete voucher"
                            aria-label={`Delete ${voucher.voucherCode}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {tab === "Pending" && vouchers.length > 0 && (
        <p className="text-xs text-zinc-500 flex items-center gap-2">
          <ClipboardCheck size={14} />
          Verify a voucher only after every item has a list price set.
        </p>
      )}
    </div>
  );
}
