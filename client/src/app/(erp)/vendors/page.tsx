"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageAccounting } from "@/lib/auth/permissions";
import { createVendor, fetchVendors } from "@/lib/api/vendors";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Vendor } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function VendorsPage() {
  const { user } = useAuth();
  const canManage = user ? canManageAccounting(user.role) : false;
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setVendors(await fetchVendors());
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load vendors."));
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
    setSubmitting(true);
    setError("");
    try {
      await createVendor({
        name,
        gstNumber: gstNumber.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setName("");
      setGstNumber("");
      setPhone("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create vendor."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (!canManage) {
    return (
      <div className="page-content">
        <PageHeader title="Vendors" subtitle="Supplier master for purchase bills" />
        <div className="surface-card p-8 text-center text-sm text-zinc-400">
          Only admins and accountants can manage vendors.
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Vendors"
        subtitle="Supplier master for purchase bills and Tally sync"
        action={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={16} />
            Add Vendor
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Name</label>
              <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>GST number</label>
              <input className={fieldClass} value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary px-4 py-2 text-sm">
              {submitting ? "Saving…" : "Save vendor"}
            </button>
          </div>
        </form>
      )}

      <div className="surface-card overflow-hidden">
        {vendors.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">
            No vendors yet. Add suppliers before recording purchase bills.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>GST</th>
                  <th>Phone</th>
                  <th>Opening balance</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td className="font-medium">{vendor.name}</td>
                    <td className="td-muted">{vendor.gstNumber ?? "—"}</td>
                    <td className="td-muted">{vendor.phone ?? "—"}</td>
                    <td className="td-num">{formatCurrency(vendor.openingBalance)}</td>
                    <td className="td-muted">{formatDate(vendor.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-400 mt-4">
        Purchase bills:{" "}
        <Link href="/purchase-bills" className="text-blue-600 hover:underline">
          Go to purchase bills →
        </Link>
      </p>
    </div>
  );
}
