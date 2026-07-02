"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createCustomerBranch,
  deleteCustomerBranch,
  fetchCustomerBranches,
  updateCustomerBranch,
} from "@/lib/api/customers";
import { getApiErrorMessage } from "@/lib/api/client";
import type { CustomerBranch, NewCustomerBranchInput } from "@/lib/types";

type CustomerBranchesTabProps = {
  customerId: string;
  customerName: string;
  canManage: boolean;
};

const emptyForm = (): NewCustomerBranchInput => ({
  name: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
});

export default function CustomerBranchesTab({
  customerId,
  customerName,
  canManage,
}: CustomerBranchesTabProps) {
  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewCustomerBranchInput>(emptyForm());
  const [saving, setSaving] = useState(false);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const customerBranches = await fetchCustomerBranches(customerId);
      setBranches(customerBranches);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load branches."));
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormOpen(false);
  };

  const startEdit = (branch: CustomerBranch) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name,
      address: branch.address ?? "",
      city: branch.city ?? "",
      state: branch.state ?? "",
      pincode: branch.pincode ?? "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await updateCustomerBranch(customerId, editingId, form);
      } else {
        await createCustomerBranch(customerId, form);
      }
      await loadBranches();
      resetForm();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save branch."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branchId: string) => {
    if (!confirm("Remove this branch from the customer?")) return;
    setError("");
    try {
      await deleteCustomerBranch(customerId, branchId);
      await loadBranches();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to remove branch."));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Branches</p>
          <p className="text-xs text-zinc-500">
            Outlets for {customerName} — stock is sent from Head Office to these
            branches
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setFormOpen(true);
            }}
            className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            <Plus size={14} />
            Add Branch
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {formOpen && canManage && (
        <div className="rounded-lg border border-zinc-200 p-4 space-y-3 bg-zinc-50">
          <p className="text-xs font-medium text-zinc-600">
            {editingId ? "Edit Branch" : "New Branch"} for {customerName}
          </p>
          <input
            type="text"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder={`e.g. ${customerName} Malviya Nagar Jaipur`}
            className="input-field w-full px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={form.city ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, city: event.target.value }))
              }
              placeholder="City"
              className="input-field w-full px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={form.state ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, state: event.target.value }))
              }
              placeholder="State"
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>
          <input
            type="text"
            value={form.address ?? ""}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, address: event.target.value }))
            }
            placeholder="Address (optional)"
            className="input-field w-full px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !form.name.trim()}
              className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Add Branch"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400">Loading branches…</p>
      ) : branches.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No branches yet. Add outlets like store locations for this customer.
        </p>
      ) : (
        <div className="space-y-2">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="rounded-lg border border-zinc-200 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-900">{branch.name}</p>
                  {(branch.city || branch.address) && (
                    <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                      <MapPin size={12} />
                      {[branch.address, branch.city, branch.state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Link
                    href={`/stock-transfer?customerId=${customerId}&customerBranchId=${branch.id}`}
                    className="btn-secondary inline-flex items-center gap-1 px-2 py-1 text-xs"
                  >
                    <ArrowRightLeft size={12} />
                    Send Stock
                  </Link>
                  {canManage && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(branch)}
                        className="p-1 text-zinc-400 hover:text-zinc-700"
                        aria-label="Edit branch"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(branch.id)}
                        className="p-1 text-zinc-400 hover:text-red-600"
                        aria-label="Remove branch"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
