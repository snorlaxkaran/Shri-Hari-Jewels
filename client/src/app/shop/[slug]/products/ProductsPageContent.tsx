"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  fetchStorefrontCategories,
  fetchStorefrontProducts,
} from "@/lib/api/storefront";
import { useStorefrontConfig } from "../(components)/StorefrontConfigProvider";
import ProductCard from "../(components)/ProductCard";
import type { StorefrontProduct } from "@/lib/storefront/types";

export default function ProductsPageContent() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const config = useStorefrontConfig();

  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [sortBy, setSortBy] = useState<"price" | "name" | "newest">("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchStorefrontCategories(slug).then(setCategories).catch(() => {});
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    fetchStorefrontProducts(slug, {
      search: search || undefined,
      category: category || undefined,
      sortBy,
      page,
      limit: 24,
    })
      .then((res) => {
        setProducts(res.products);
        setTotal(res.total);
      })
      .catch(() => {
        setProducts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [slug, search, category, sortBy, page]);

  const totalPages = Math.ceil(total / 24);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-light tracking-wide" style={{ color: config.accentColor }}>
        Shop All
      </h1>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search jewellery..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full rounded border border-zinc-200 px-4 py-2 text-sm sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-3">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="rounded border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="price">Price</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-zinc-200" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="py-20 text-center text-zinc-500">No products found.</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-zinc-500">{total} product{total !== 1 ? "s" : ""}</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} slug={slug} product={product} config={config} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="flex items-center px-4 text-sm text-zinc-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
