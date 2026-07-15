"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import {
  bulkPublishProducts,
  fetchPublishableProducts,
  setProductPublished,
} from "@/lib/api/storefront-admin";
import { formatCurrency } from "@/lib/format";
import type { PublishableProduct } from "@/lib/storefront/types";

export default function StorefrontProductsPage() {
  const [products, setProducts] = useState<PublishableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "unpublished">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    fetchPublishableProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader title="Publish Products" subtitle="Choose which inventory items appear on your online store" />
      <div className="mb-4"><Link href="/storefront" className="text-sm text-zinc-500 hover:underline">← Back to Online Store</Link></div>

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
            <button type="button" onClick={() => bulkPublish(true)} className="rounded bg-green-700 px-3 py-1.5 text-xs text-white">
              Publish {selected.size} selected
            </button>
            <button type="button" onClick={() => bulkPublish(false)} className="rounded border px-3 py-1.5 text-xs">
              Unpublish {selected.size} selected
            </button>
          </>
        )}
      </div>

      <div className="surface-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left text-xs text-zinc-500">
              <th className="p-3 w-8"><input type="checkbox" onChange={(e) => {
                if (e.target.checked) setSelected(new Set(filtered.map((p) => p.id)));
                else setSelected(new Set());
              }} /></th>
              <th className="p-3">Product</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Online</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
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
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-zinc-500">No products found.</p>
        )}
      </div>
    </div>
  );
}
