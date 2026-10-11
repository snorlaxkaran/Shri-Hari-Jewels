"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, FileSpreadsheet } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import {
  bulkPublishProducts,
  fetchAdminCollections,
  fetchPublishableProducts,
  fetchRelatedProductIds,
  fetchStorefrontAdminSettings,
  setAdminRelatedProducts,
  setProductPublished,
} from "@/lib/api/storefront-admin";
import { formatCurrency } from "@/lib/format";
import {
  downloadProductListingWorkbook,
  parseListingSkus,
} from "@/lib/storefront/product-listing-template";
import { storefrontProductPath } from "@/lib/storefront/urls";
import type {
  PublishableProduct,
  StorefrontAdminSettings,
  StorefrontCollection,
} from "@/lib/storefront/types";

export default function StorefrontProductsPage() {
  const [products, setProducts] = useState<PublishableProduct[]>([]);
  const [collections, setCollections] = useState<StorefrontCollection[]>([]);
  const [settings, setSettings] = useState<StorefrontAdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [listingSkus, setListingSkus] = useState("");
  const [listingFeedback, setListingFeedback] = useState("");
  const [listingError, setListingError] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "unpublished">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingRelatedId, setEditingRelatedId] = useState<string | null>(null);
  const [relatedSelection, setRelatedSelection] = useState<Set<string>>(new Set());
  const [relatedSaving, setRelatedSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchPublishableProducts(),
      fetchStorefrontAdminSettings(),
      fetchAdminCollections(),
    ])
      .then(([prods, storeSettings, storeCollections]) => {
        setProducts(prods);
        setSettings(storeSettings);
        setCollections(storeCollections);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = products.filter((p) => {
    if (filter === "published") return p.publishedToStorefront;
    if (filter === "unpublished") return !p.publishedToStorefront;
    return true;
  });

  const togglePublish = async (product: PublishableProduct) => {
    await setProductPublished(product.id, !product.publishedToStorefront);
    load();
  };

  const bulkPublish = async (published: boolean) => {
    if (selected.size === 0) return;
    await bulkPublishProducts([...selected], published);
    setSelected(new Set());
    load();
  };

  const downloadListingWorkbook = () => {
    setListingError("");
    setListingFeedback("");
    const skus = parseListingSkus(listingSkus);
    if (skus.length === 0) {
      setListingError("Enter at least one SKU, separated by commas.");
      return;
    }

    const result = downloadProductListingWorkbook(skus, products, collections);
    if (result.unmatchedSkus.length > 0) {
      const preview = result.unmatchedSkus.slice(0, 5).join(", ");
      const more = result.unmatchedSkus.length > 5 ? "…" : "";
      setListingFeedback(
        `Downloaded ${result.skuCount} listing rows. ${result.matchedCount} matched central stock; check these SKUs: ${preview}${more}`,
      );
      return;
    }
    setListingFeedback(`Downloaded a listing workbook with ${result.skuCount} matched SKUs.`);
  };

  const startEditRelated = async (productId: string) => {
    setEditingRelatedId(productId);
    try {
      const ids = await fetchRelatedProductIds(productId);
      setRelatedSelection(new Set(ids));
    } catch {
      setRelatedSelection(new Set());
    }
  };

  const saveRelatedProducts = async () => {
    if (!editingRelatedId) return;
    setRelatedSaving(true);
    try {
      await setAdminRelatedProducts(editingRelatedId, [...relatedSelection]);
      setEditingRelatedId(null);
    } finally {
      setRelatedSaving(false);
    }
  };

  const publishedProducts = products.filter((p) => p.publishedToStorefront);

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title="Publish Products"
        subtitle="Choose which inventory items appear on your online store"
        action={
          settings?.storeUrl ? (
            <a
              href={settings.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
            >
              <ExternalLink size={15} />
              View shop
            </a>
          ) : undefined
        }
      />
      <div className="mb-4">
        <Link href="/storefront" className="text-sm text-zinc-500 hover:underline">
          ← Back to Online Store
        </Link>
      </div>

      <section className="surface-card mb-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-zinc-600" />
          <h2 className="font-semibold">Prepare a product listing workbook</h2>
        </div>
        <p className="mb-3 max-w-3xl text-sm text-zinc-500">
          Enter only the SKUs you want to prepare for the website. The workbook includes product details where a SKU matches central stock, plus editable SEO, dimensions, international price, and collection fields. Downloading the sheet does not publish anything.
        </p>
        <label htmlFor="listing-skus" className="mb-1 block text-sm font-medium">
          SKUs to list
        </label>
        <textarea
          id="listing-skus"
          value={listingSkus}
          onChange={(event) => setListingSkus(event.target.value)}
          rows={3}
          className="input-field w-full max-w-3xl px-3 py-2 text-sm"
          placeholder="e.g. SHJ-1001, SHJ-1002, SHJ-1003"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Separate SKUs with commas. New lines and semicolons are also accepted. Existing collections: {collections.length}.
        </p>
        {listingError && <p className="mt-2 text-sm text-red-700">{listingError}</p>}
        {listingFeedback && <p className="mt-2 text-sm text-blue-800">{listingFeedback}</p>}
        <button
          type="button"
          onClick={downloadListingWorkbook}
          className="btn-primary mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Download size={15} />
          Download listing workbook
        </button>
      </section>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        {(["all", "published", "unpublished"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1.5 text-xs capitalize ${filter === f ? "bg-zinc-900 text-white" : "border"}`}
          >
            {f}
          </button>
        ))}
        {selected.size > 0 && (
          <>
            <button
              type="button"
              onClick={() => bulkPublish(true)}
              className="rounded bg-green-700 px-3 py-1.5 text-xs text-white"
            >
              Publish {selected.size} selected
            </button>
            <button
              type="button"
              onClick={() => bulkPublish(false)}
              className="rounded border px-3 py-1.5 text-xs"
            >
              Unpublish {selected.size} selected
            </button>
          </>
        )}
      </div>

      <div className="surface-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left text-xs text-zinc-500">
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(filtered.map((p) => p.id)));
                    else setSelected(new Set());
                  }}
                />
              </th>
              <th className="p-3">Product</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Online</th>
              <th className="p-3">Related</th>
              <th className="p-3">Website</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const storeHref =
                settings?.slug && product.publishedToStorefront
                  ? storefrontProductPath(settings.slug, product.id)
                  : null;

              return (
                <tr key={product.id} className="border-b hover:bg-zinc-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(product.id);
                        else next.delete(product.id);
                        setSelected(next);
                      }}
                    />
                  </td>
                  <td className="p-3 font-medium">{product.name}</td>
                  <td className="p-3 text-zinc-500">{product.sku}</td>
                  <td className="p-3">{product.category}</td>
                  <td className="p-3">{formatCurrency(product.price)}</td>
                  <td className="p-3">{product.stock}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => togglePublish(product)}
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        product.publishedToStorefront
                          ? "bg-green-100 text-green-800"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {product.publishedToStorefront ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="p-3">
                    {product.publishedToStorefront ? (
                      <button
                        type="button"
                        onClick={() => startEditRelated(product.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit related
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {storeHref ? (
                      <a
                        href={storeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:underline"
                      >
                        <ExternalLink size={13} />
                        View on website
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-400" title="Publish this product to enable the store link">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-zinc-500">No products found.</p>
        )}
      </div>

      {editingRelatedId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgb(0 0 0 / 0.4)" }}
        >
          <div
            className="max-w-lg w-full max-h-[80vh] overflow-auto rounded-xl border p-6"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
          >
            <h3 className="font-medium mb-1">Related products</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Shown in &ldquo;You may also like&rdquo; on this product&apos;s store page. One-directional — not mirrored on related items.
            </p>
            <ul className="space-y-2 mb-4">
              {publishedProducts
                .filter((p) => p.id !== editingRelatedId)
                .map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={relatedSelection.has(p.id)}
                      onChange={(e) => {
                        const next = new Set(relatedSelection);
                        if (e.target.checked) next.add(p.id);
                        else next.delete(p.id);
                        setRelatedSelection(next);
                      }}
                    />
                    <span>{p.name}</span>
                    <span className="text-xs text-zinc-500 ml-auto">{p.sku}</span>
                  </li>
                ))}
            </ul>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditingRelatedId(null)}
                className="rounded border px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveRelatedProducts}
                disabled={relatedSaving}
                className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-60"
              >
                {relatedSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
