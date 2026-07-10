"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import RowActionsDropdown from "@/app/(components)/RowActionsDropdown";
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
  const [deleteTarget, setDeleteTarget] = useState<EntryVoucher | null>(null);

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setError("");
    try {
      await deleteEntryVoucher(deleteTarget.id);
      setDeleteTarget(null);
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
    <div className="page-content">
      <PageHeader
        title="Entry Verification"
        subtitle="Review bulk stock entries before they become live inventory"
      />

      <div className="filter-bar">
        <div className="flex gap-2">
          {(["Pending", "Verified"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setTab(status)}
              className={`tab-btn ${tab === status ? "tab-btn-active" : "tab-btn-inactive"}`}
            >
              {status === "Pending" ? "Pending" : "Verified"}
            </button>
          ))}
        </div>
        <span className="filter-count">
          Showing {vouchers.length} of {vouchers.length}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Voucher ID</th>
                <th>Employee</th>
                <th>Items</th>
                <th>Status</th>
                {canManage && tab === "Pending" && (
                  <th className="text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage && tab === "Pending" ? 6 : 5}
                    className="text-center td-muted"
                    style={{ padding: "40px 12px" }}
                  >
                    {tab === "Pending"
                      ? "No vouchers awaiting verification."
                      : "No verified vouchers yet."}
                  </td>
                </tr>
              ) : (
                vouchers.map((voucher) => (
                  <tr key={voucher.id}>
                    <td className="td-muted">{formatDateTime(voucher.createdAt)}</td>
                    <td className="td-code">
                      <Link href={`/entry-verification/${voucher.id}`}>
                        {voucher.voucherCode}
                      </Link>
                    </td>
                    <td className="td-muted">{voucher.createdByName}</td>
                    <td className="td-num">
                      {voucher.pricedItemCount}/{voucher.itemCount} priced
                    </td>
                    <td>
                      <StatusBadge
                        status={
                          voucher.status === "Pending" ? "Pending" : "Completed"
                        }
                      />
                    </td>
                    {canManage && tab === "Pending" && (
                      <td className="text-right">
                        <RowActionsDropdown
                          actions={[
                            {
                              label: "Edit",
                              onClick: () =>
                                router.push(`/entry-verification/${voucher.id}`),
                            },
                            {
                              label: "View prices",
                              onClick: () =>
                                router.push(
                                  `/entry-verification/${voucher.id}?focus=prices`,
                                ),
                            },
                            {
                              label: "Delete",
                              destructive: true,
                              onClick: () => setDeleteTarget(voucher),
                            },
                          ]}
                        />
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

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete voucher?"
        message={
          deleteTarget
            ? `Delete voucher ${deleteTarget.voucherCode} and all ${deleteTarget.itemCount} inactive item(s)? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
        loading={deletingId !== null}
      />
    </div>
  );
}
