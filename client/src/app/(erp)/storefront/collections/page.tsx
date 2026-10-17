"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import {
  createAdminCollection,
  deleteAdminCollection,
  fetchAdminCollections,
  fetchPublishableProducts,
  fetchStorefrontAdminSettings,
  setAdminCollectionProducts,
  updateAdminCollection,
} from "@/lib/api/storefront-admin";
import { getApiErrorMessage } from "@/lib/api/client";
import { BANNER_SLOT_COUNT, padBannerSlots } from "@/lib/storefront/banner-crop";
import type { PublishableProduct, StorefrontCollection } from "@/lib/storefront/types";
import BannerCarouselEditor from "../settings/BannerCarouselEditor";

export default function StorefrontCollectionsPage() {
  const [collections, setCollections] = useState<StorefrontCollection[]>([]);
  const [products, setProducts] = useState<PublishableProduct[]>([]);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [editingProductsId, setEditingProductsId] = useState<string | null>(null);
  const [editingBannersId, setEditingBannersId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bannerDraft, setBannerDraft] = useState<string[]>(() =>
    Array(BANNER_SLOT_COUNT).fill(""),
  );
  const [savingBanners, setSavingBanners] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cols, prods, settings] = await Promise.all([
        fetchAdminCollections(),
        fetchPublishableProducts(),
        fetchStorefrontAdminSettings(),
      ]);
      setCollections(cols);
      setProducts(prods.filter((p) => p.publishedToStorefront));
      setStoreUrl(settings.storeUrl ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
    if (editingProductsId === id) setEditingProductsId(null);
    if (editingBannersId === id) setEditingBannersId(null);
    load();
  };

  const startEditProducts = (col: StorefrontCollection) => {
    setEditingBannersId(null);
    setEditingProductsId(col.id);
    setSelectedProducts(new Set(col.productIds ?? []));
  };

  const startEditBanners = (col: StorefrontCollection) => {
    setEditingProductsId(null);
    setEditingBannersId(col.id);
    setBannerDraft(padBannerSlots(col.bannerUrls ?? [], col.imageUrl));
  };

  const saveCollectionProducts = async () => {
    if (!editingProductsId) return;
    setError("");
    try {
      await setAdminCollectionProducts(editingProductsId, [...selectedProducts]);
      setEditingProductsId(null);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update collection products."));
    }
  };

  const saveCollectionBanners = async (col: StorefrontCollection) => {
    setSavingBanners(true);
    setError("");
    try {
      const bannerUrls = bannerDraft
        .map((url) => url.trim())
        .filter(Boolean)
        .slice(0, BANNER_SLOT_COUNT);
      await updateAdminCollection(col.id, { bannerUrls });
      setEditingBannersId(null);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save collection banners."));
    } finally {
      setSavingBanners(false);
    }
  };

  const collectionPageUrl = (col: StorefrontCollection) =>
    storeUrl ? `${storeUrl.replace(/\/$/, "")}/collections/${col.slug}` : null;

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title="Collections"
        subtitle="Group products and set hero banners shown when shoppers open a collection on your website"
      />
      <div className="mb-4">
        <Link href="/storefront" className="text-sm text-zinc-500 hover:underline">
          ← Back to Online Store
        </Link>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="surface-card p-5 mb-6 max-w-lg space-y-3">
        <h3 className="font-medium text-sm">New Collection</h3>
        <input
          className="input-field w-full px-3 py-2 text-sm"
          placeholder="Collection name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          className="input-field w-full px-3 py-2 text-sm"
          placeholder="Description (optional)"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" className="btn-primary px-4 py-2 text-sm">Create Collection</button>
      </form>

      <div className="space-y-4">
        {collections.map((col) => {
          const liveUrl = collectionPageUrl(col);
          return (
            <div key={col.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-medium">{col.name}</h3>
                  {col.description && (
                    <p className="mt-1 text-sm text-zinc-500">{col.description}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-400">
                    {col.productCount} products · /collections/{col.slug}
                    {(col.bannerUrls?.length ?? 0) > 0 &&
                      ` · ${col.bannerUrls.length} banner${col.bannerUrls.length === 1 ? "" : "s"}`}
                  </p>
                  {liveUrl && (
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      View on website
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div className="flex flex-shrink-0 flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => startEditBanners(col)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Collection banners
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditProducts(col)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Manage products
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(col.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {editingBannersId === col.id && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Banners on collection page</h4>
                  <BannerCarouselEditor
                    banners={bannerDraft}
                    onChange={setBannerDraft}
                    heroTitle={col.name}
                    heroSubtitle={col.description ?? undefined}
                    placement="collection"
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      disabled={savingBanners}
                      onClick={() => saveCollectionBanners(col)}
                      className="btn-primary px-3 py-1.5 text-xs disabled:opacity-60"
                    >
                      {savingBanners ? "Saving…" : "Save banners"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBannersId(null)}
                      className="border px-3 py-1.5 text-xs rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {editingProductsId === col.id && (
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
                    <button
                      type="button"
                      onClick={saveCollectionProducts}
                      className="btn-primary px-3 py-1.5 text-xs"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProductsId(null)}
                      className="border px-3 py-1.5 text-xs rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {collections.length === 0 && (
          <p className="text-center text-zinc-500 py-8">No collections yet. Create one above.</p>
        )}
      </div>
    </div>
  );
}
