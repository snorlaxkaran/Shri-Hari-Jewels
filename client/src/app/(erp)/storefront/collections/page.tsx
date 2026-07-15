"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import {
  createAdminCollection,
  deleteAdminCollection,
  fetchAdminCollections,
  fetchPublishableProducts,
  setAdminCollectionProducts,
} from "@/lib/api/storefront-admin";
import { getApiErrorMessage } from "@/lib/api/client";
import type { PublishableProduct, StorefrontCollection } from "@/lib/storefront/types";

export default function StorefrontCollectionsPage() {
  const [collections, setCollections] = useState<StorefrontCollection[]>([]);
  const [products, setProducts] = useState<PublishableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const [cols, prods] = await Promise.all([
        fetchAdminCollections(),
        fetchPublishableProducts(),
      ]);
      setCollections(cols);
      setProducts(prods.filter((p) => p.publishedToStorefront));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await createAdminCollection({ name, description: description || undefined });
      setName("");
      setDescription("");
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create collection."));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this collection?")) return;
    await deleteAdminCollection(id);
    load();
  };

  const startEditProducts = (col: StorefrontCollection) => {
    setEditingId(col.id);
    setSelectedProducts(new Set());
  };

  const saveCollectionProducts = async () => {
    if (!editingId) return;
    await setAdminCollectionProducts(editingId, [...selectedProducts]);
    setEditingId(null);
    load();
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader title="Collections" subtitle="Group products into curated collections for your store" />
      <div className="mb-4"><Link href="/storefront" className="text-sm text-zinc-500 hover:underline">← Back to Online Store</Link></div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">{error}</div>}

      <form onSubmit={handleCreate} className="surface-card p-5 mb-6 max-w-lg space-y-3">
        <h3 className="font-medium text-sm">New Collection</h3>
        <input className="input-field w-full px-3 py-2 text-sm" placeholder="Collection name" value={name} onChange={(e) => setName(e.target.value)} required />
        <textarea className="input-field w-full px-3 py-2 text-sm" placeholder="Description (optional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit" className="btn-primary px-4 py-2 text-sm">Create Collection</button>
      </form>

      <div className="space-y-4">
        {collections.map((col) => (
          <div key={col.id} className="surface-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{col.name}</h3>
                {col.description && <p className="mt-1 text-sm text-zinc-500">{col.description}</p>}
                <p className="mt-1 text-xs text-zinc-400">{col.productCount} products · /collections/{col.slug}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => startEditProducts(col)} className="text-xs text-blue-600 hover:underline">
                  Manage Products
                </button>
                <button type="button" onClick={() => handleDelete(col.id)} className="text-xs text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </div>

            {editingId === col.id && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs text-zinc-500 mb-2">Select published products for this collection:</p>
                <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(p.id)}
                        onChange={(e) => {
                          const next = new Set(selectedProducts);
                          if (e.target.checked) next.add(p.id);
                          else next.delete(p.id);
                          setSelectedProducts(next);
                        }}
                      />
                      {p.name} ({p.sku})
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={saveCollectionProducts} className="btn-primary px-3 py-1.5 text-xs">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="border px-3 py-1.5 text-xs rounded">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {collections.length === 0 && (
          <p className="text-center text-zinc-500 py-8">No collections yet. Create one above.</p>
        )}
      </div>
    </div>
  );
}
