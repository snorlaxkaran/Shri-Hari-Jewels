"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, FileSpreadsheet, ImagePlus, Upload } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api/client";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import {
  bulkPublishProducts,
  fetchPublishableProducts,
  fetchRelatedProductIds,
  fetchStorefrontAdminSettings,
  importProductListing,
  setAdminRelatedProducts,
  setProductPublished,
  uploadListingImages,
} from "@/lib/api/storefront-admin";
import { formatCurrency } from "@/lib/format";
import {
  buildListingImagePayload,
  groupListingImageFiles,
  MAX_LISTING_IMAGES_PER_SKU,
} from "@/lib/storefront/listing-images";
import {
  downloadProductListingWorkbook,
  parseListingSkus,
  parseListingWorkbook,
} from "@/lib/storefront/product-listing-template";
import { readExcelFileWithGuard } from "@/lib/excel-import-guard";
import { storefrontProductPath } from "@/lib/storefront/urls";
import type {
  PublishableProduct,
  StorefrontAdminSettings,
} from "@/lib/storefront/types";

export default function StorefrontProductsPage() {
  const [products, setProducts] = useState<PublishableProduct[]>([]);
  const [settings, setSettings] = useState<StorefrontAdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [listingSkus, setListingSkus] = useState("");
  const [listingFeedback, setListingFeedback] = useState("");
  const [listingError, setListingError] = useState("");
  const [importingListing, setImportingListing] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [publishError, setPublishError] = useState("");
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
    ])
      .then(([prods, storeSettings]) => {
        setProducts(prods);
        setSettings(storeSettings);
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
    setPublishError("");
    try {
      await setProductPublished(product.id, !product.publishedToStorefront);
      load();
    } catch (err) {
      setPublishError(getApiErrorMessage(err, "Could not update publish status."));
    }
  };

  const bulkPublish = async (published: boolean) => {
    if (selected.size === 0) return;
    setPublishError("");
    try {
      await bulkPublishProducts([...selected], published);
      setSelected(new Set());
      load();
    } catch (err) {
      setPublishError(getApiErrorMessage(err, "Could not bulk publish."));
    }
  };

  const downloadListingWorkbook = () => {
    setListingError("");
    setListingFeedback("");
    const skus = parseListingSkus(listingSkus);
    if (skus.length === 0) {
      setListingError("Enter at least one SKU, separated by commas.");
      return;
    }

    const result = downloadProductListingWorkbook(skus, products);
    if (result.exportedCount === 0) {
      setListingError(
        "No active SKUs to export. SKUs must exist in central stock with available quantity.",
      );
      return;
    }
    if (result.omittedSkus.length > 0) {
      const preview = result.omittedSkus.slice(0, 6).join(", ");
      const more = result.omittedSkus.length > 6 ? "…" : "";
      setListingFeedback(
        `Downloaded ${result.exportedCount} active SKU(s). Omitted (inactive or missing): ${preview}${more}`,
      );
      return;
    }
    setListingFeedback(`Downloaded listing workbook with ${result.exportedCount} active SKU(s).`);
  };

  const handleListingUpload = async (file: File) => {
    setListingError("");
    setListingFeedback("");
    setImportingListing(true);
    try {
      const buffer = await readExcelFileWithGuard(file);
      const rows = parseListingWorkbook(buffer);
      if (rows.length === 0) {
        setListingError("No product rows found in the workbook.");
        return;
      }
      const result = await importProductListing(rows);
      const failed = result.errors.length;
      setListingFeedback(
        `Imported ${result.updated} SKU(s). ${result.published} live on website. ${failed} row(s) failed validation.`,
      );
      if (failed > 0) {
        const sample = result.errors
          .slice(0, 3)
          .map((e) => `${e.sku}: ${e.message}`)
          .join(" · ");
        setListingError(sample);
      }
      load();
    } catch (err) {
      setListingError(getApiErrorMessage(err, "Could not import listing workbook."));
    } finally {
      setImportingListing(false);
    }
  };

  const handleListingImagesUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setListingError("");
    setListingFeedback("");
    setUploadingImages(true);
    try {
      const { parsed, invalid } = groupListingImageFiles([...fileList]);
      if (invalid.length > 0) {
        setListingError(
          `Invalid names (use SKU_1.jpg … SKU_${MAX_LISTING_IMAGES_PER_SKU}.png): ${invalid.slice(0, 5).join(", ")}`,
        );
        if (parsed.length === 0) return;
      }
      const payload = await buildListingImagePayload(parsed);
      const result = await uploadListingImages(payload);
      setListingFeedback(`Uploaded ${result.applied} image(s) for website listing.`);
      if (result.errors.length > 0) {
        setListingError(result.errors.slice(0, 4).join(" · "));
      }
      load();
    } catch (err) {
      setListingError(getApiErrorMessage(err, "Could not upload listing images."));
    } finally {
      setUploadingImages(false);
    }
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
        title="Product listing"
        subtitle="Download listing Excel from central SKUs, fill SEO fields, upload, then add photos to go live"
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
          <h2 className="font-semibold">1. Download listing Excel (central SKUs)</h2>
        </div>
        <p className="mb-3 max-w-3xl text-sm text-zinc-500">
          Enter comma-separated SKUs. Only SKUs that are <strong>active in central stock</strong> are
          included in the Excel. Columns: stock id, weight, price, selling price, description, SEO,
          sorting (YYYYMMDD — newest sorts first on the shop), HSN, and more.
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
          placeholder="e.g. TSER0220, SHJ-1002, SHJ-1003"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Separate SKUs with commas, new lines, or semicolons. Inactive or unknown SKUs are skipped in
          the file.
        </p>
        <button
          type="button"
          onClick={downloadListingWorkbook}
          className="btn-primary mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Download size={15} />
          Download Excel
        </button>
      </section>

      <section className="surface-card mb-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Upload size={18} className="text-zinc-600" />
          <h2 className="font-semibold">2. Upload filled Excel</h2>
        </div>
        <p className="mb-3 max-w-3xl text-sm text-zinc-500">
          Weight and price must match central ERP or the row is rejected. Products go live only when
          they have at least one photo (step 3).
        </p>
        <label className="btn-secondary inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-sm">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            disabled={importingListing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleListingUpload(file);
              e.target.value = "";
            }}
          />
          {importingListing ? "Importing…" : "Choose Excel file"}
        </label>
      </section>

      <section className="surface-card mb-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <ImagePlus size={18} className="text-zinc-600" />
          <h2 className="font-semibold">3. Upload product photos</h2>
        </div>
        <p className="mb-3 max-w-3xl text-sm text-zinc-500">
          Name files <code className="text-xs bg-zinc-100 px-1 rounded">SKU_1.jpg</code> through{" "}
          <code className="text-xs bg-zinc-100 px-1 rounded">SKU_8.png</code> (e.g.{" "}
          <code className="text-xs bg-zinc-100 px-1 rounded">TSER0220_1.jpeg</code>). Minimum 1, maximum
          8 photos per SKU required to publish on the website.
        </p>
        <label className="btn-secondary inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-sm">
          <input
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            multiple
            className="hidden"
            disabled={uploadingImages}
            onChange={(e) => void handleListingImagesUpload(e.target.files)}
          />
          {uploadingImages ? "Uploading…" : "Choose images"}
        </label>
      </section>

      {(listingError || listingFeedback || publishError) && (
        <div className="mb-4 space-y-2">
          {listingError && <p className="text-sm text-red-700">{listingError}</p>}
          {publishError && <p className="text-sm text-red-700">{publishError}</p>}
          {listingFeedback && <p className="text-sm text-blue-800">{listingFeedback}</p>}
        </div>
      )}

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
              <th className="p-3">Photos</th>
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
                    <span
                      className={
                        product.imageCount >= 1 ? "text-green-700" : "text-amber-700"
                      }
                    >
                      {product.imageCount}/8
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => togglePublish(product)}
                      disabled={!product.publishedToStorefront && product.imageCount < 1}
                      title={
                        product.imageCount < 1
                          ? "Upload at least one SKU_N photo first"
                          : undefined
                      }
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
