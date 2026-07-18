"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageAccounting } from "@/lib/auth/permissions";
import { fetchEntryVouchers } from "@/lib/api/entry-vouchers";
import { createPurchaseBill, fetchPurchaseBills } from "@/lib/api/purchase-bills";
import { fetchVendors } from "@/lib/api/vendors";
import { getApiErrorMessage } from "@/lib/api/client";
import type { PurchaseBill, Vendor } from "@/lib/types";
import { formatCurrency, formatDate, parseMoneyInput } from "@/lib/format";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function PurchaseBillsPage() {
  const { user } = useAuth();
  const canManage = user ? canManageAccounting(user.role) : false;
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [voucherOptions, setVoucherOptions] = useState<Array<{ id: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [vendorId, setVendorId] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryVoucherId, setEntryVoucherId] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [gstAmount, setGstAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");

  const total = useMemo(() => {
    const sub = parseMoneyInput(subtotal || "0");
    const gst = parseMoneyInput(gstAmount || "0");
    return sub + gst;
  }, [subtotal, gstAmount]);

  const load = useCallback(async () => {
    setError("");
    try {
      const [billRows, vendorRows, vouchers] = await Promise.all([
        fetchPurchaseBills(),
        fetchVendors(),
        fetchEntryVouchers("Verified"),
      ]);
      setBills(billRows);
      setVendors(vendorRows);
      setVoucherOptions(vouchers.map((v) => ({ id: v.id, code: v.voucherCode })));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load purchase bills."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) void load();
    else setLoading(false);
  }, [canManage, load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      setError("Select a vendor.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await createPurchaseBill({
        vendorId,
        billNo,
        billDate,
        entryVoucherId: entryVoucherId || undefined,
        subtotal: parseMoneyInput(subtotal),
        gstAmount: parseMoneyInput(gstAmount || "0"),
        total,
        paidAmount: parseMoneyInput(paidAmount || "0"),
      });
      setShowForm(false);
      setBillNo("");
      setSubtotal("");
      setGstAmount("");
      setPaidAmount("");
      setEntryVoucherId("");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create purchase bill."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (!canManage) {
    return (
      <div className="page-content">
        <PageHeader title="Purchase Bills" subtitle="Vendor purchase records for accounting" />
        <div className="surface-card p-8 text-center text-sm text-zinc-400">
          Only admins and accountants can manage purchase bills.
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Purchase Bills"
        subtitle="Record vendor bills for Tally purchase voucher export"
        action={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={16} />
            New Bill
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="surface-card p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Vendor</label>
              <select className={fieldClass} value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
                <option value="">Select vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Bill number</label>
              <input className={fieldClass} value={billNo} onChange={(e) => setBillNo(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>Bill date</label>
              <input type="date" className={fieldClass} value={billDate} onChange={(e) => setBillDate(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>Link entry voucher (optional)</label>
              <select className={fieldClass} value={entryVoucherId} onChange={(e) => setEntryVoucherId(e.target.value)}>
                <option value="">None</option>
                {voucherOptions.map((v) => (
                  <option key={v.id} value={v.id}>{v.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Subtotal</label>
              <input className={fieldClass} value={subtotal} onChange={(e) => setSubtotal(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>GST amount</label>
              <input className={fieldClass} value={gstAmount} onChange={(e) => setGstAmount(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Total (auto)</label>
              <input className={fieldClass} value={total.toFixed(2)} readOnly />
            </div>
            <div>
              <label className={labelClass}>Paid amount</label>
              <input className={fieldClass} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
            </div>
          </div>
          {vendors.length === 0 && (
            <p className="text-xs text-amber-700">
              Add a vendor first on the{" "}
              <Link href="/vendors" className="underline">vendors page</Link>.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || vendors.length === 0} className="btn-primary px-4 py-2 text-sm">
              {submitting ? "Saving…" : "Save bill"}
            </button>
          </div>
        </form>
      )}

      <div className="surface-card overflow-hidden">
        {bills.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">
            No purchase bills recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill No.</th>
                  <th>Vendor</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th>Entry voucher</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id}>
                    <td className="td-code">{bill.billNo}</td>
                    <td>{bill.vendorName ?? "—"}</td>
                    <td className="td-muted">{formatDate(bill.billDate)}</td>
                    <td className="td-num">{formatCurrency(bill.total)}</td>
                    <td className="td-num">{formatCurrency(bill.paidAmount)}</td>
                    <td><StatusBadge status={bill.status} /></td>
                    <td className="td-muted">{bill.entryVoucherCode ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
