"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteInventory } from "@/lib/auth/permissions";
import {
  createProductCollection,
  fetchProductCollections,
} from "@/lib/api/product-collections";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ProductCollection } from "@/lib/types";
import { formatDate } from "@/lib/format";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function ProductsPage() {
  const { user } = useAuth();
  const canManage = user ? canWriteInventory(user.role) : false;
  const [collections, setCollections] = useState<ProductCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setCollections(await fetchProductCollections(false));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load collections."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createProductCollection({ name: name.trim() });
      setName("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create collection."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title="Product"
        subtitle="Manage product collections used when adding stock"
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              Add Collection
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {showForm && canManage && (
        <form onSubmit={handleCreate} className="form-section mb-6 max-w-md">
          <div>
            <label className={labelClass}>Collection name</label>
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bridal, Classic"
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary px-4 py-2 text-sm">
              {submitting ? "Saving…" : "Save collection"}
            </button>
          </div>
        </form>
      )}

      <div className="data-table-wrap">
        {collections.length === 0 ? (
          <p className="py-8 text-sm text-zinc-400 text-center">
            No collections yet. Add collections to tag products when entering stock.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => (
                <tr key={collection.id}>
                  <td className="font-medium">{collection.name}</td>
                  <td className="td-muted">{collection.isActive ? "Active" : "Inactive"}</td>
                  <td className="td-muted">{formatDate(collection.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
