"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchStorefrontProduct, formatStorePrice } from "@/lib/api/storefront";
import { useStorefrontCart } from "@/lib/storefront/cart-context";
import { useStorefrontConfig } from "../../(components)/StorefrontConfigProvider";
import type { StorefrontProduct } from "@/lib/storefront/types";

export default function ProductDetailPage() {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const config = useStorefrontConfig();
  const { addItem } = useStorefrontCart();
  const [product, setProduct] = useState<StorefrontProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetchStorefrontProduct(slug, productId)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug, productId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-lg bg-zinc-200" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-zinc-200" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-zinc-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <p className="text-zinc-500">Product not found.</p>
        <Link href={`/shop/${slug}/products`} className="mt-4 inline-block text-sm underline">
          Back to shop
        </Link>
      </div>
    );
  }

  const imageUrl = product.images[0]?.url;
  const inStock = product.stock > 0;

  const handleAdd = () => {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2">
        <div
          className="aspect-square overflow-hidden rounded-lg"
          style={{ backgroundColor: product.imageColor }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-8xl opacity-30">💎</div>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">{product.category}</p>
          <h1 className="mt-2 text-3xl font-light" style={{ color: config.accentColor }}>
            {product.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">SKU: {product.sku}</p>
          <p className="mt-4 text-3xl font-semibold" style={{ color: config.primaryColor }}>
            {formatStorePrice(product.price)}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-zinc-500">Metal</dt><dd className="font-medium">{product.metal}</dd></div>
            <div><dt className="text-zinc-500">Purity</dt><dd className="font-medium">{product.purity}</dd></div>
            <div><dt className="text-zinc-500">Weight</dt><dd className="font-medium">{product.weightGrams}g</dd></div>
            <div><dt className="text-zinc-500">Availability</dt><dd className="font-medium">{product.status}</dd></div>
          </dl>

          {product.storefrontDescription && (
            <p className="mt-6 leading-relaxed text-zinc-600 whitespace-pre-line">
              {product.storefrontDescription}
            </p>
          )}

          {inStock && (
            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center rounded border">
                <button
                  type="button"
                  className="px-3 py-2"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span className="px-4 py-2 text-sm">{quantity}</span>
                <button
                  type="button"
                  className="px-3 py-2"
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="flex-1 rounded py-3 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: config.primaryColor }}
              >
                {added ? "Added to Cart ✓" : "Add to Cart"}
              </button>
            </div>
          )}

          {!inStock && (
            <p className="mt-8 rounded border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Currently out of stock. Contact us for availability.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
