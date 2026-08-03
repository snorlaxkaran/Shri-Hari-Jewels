"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import {
  fetchStorefrontCategories,
  fetchStorefrontProducts,
} from "@/lib/api/storefront";
import ProductCard from "../(components)/ProductCard";
import type { StorefrontProduct } from "@/lib/storefront/types";

export default function ProductsPageContent() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

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
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    const qs = params.toString();
    router.replace(`/shop/${slug}/products${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [search, category, slug, router]);

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
    <div className="sf-section">
      <div className="sf-shell">
        <p className="sf-eyebrow">Catalogue</p>
        <h1 className="sf-display sf-page-title">Shop all jewellery</h1>

        <div className="sf-toolbar">
          <div className="sf-search">
            <Search size={16} className="text-[var(--sf-muted)] shrink-0" />
            <input
              type="search"
              placeholder="Search by name, metal, category…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="sf-select"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="sf-select"
              aria-label="Sort products"
            >
              <option value="newest">Newest first</option>
              <option value="price">Price</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="sf-product-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="sf-skeleton" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="sf-empty">
            <p className="sf-empty-title">No pieces found</p>
            <p className="sf-empty-desc">Try a different search or browse all categories.</p>
          </div>
        ) : (
          <>
            <p className="sf-count">
              {total} piece{total !== 1 ? "s" : ""}
              {category ? ` in ${category}` : ""}
            </p>
            <div className="sf-product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} slug={slug} product={product} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="sf-pagination">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="sf-pagination-btn"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--sf-muted)]">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="sf-pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
