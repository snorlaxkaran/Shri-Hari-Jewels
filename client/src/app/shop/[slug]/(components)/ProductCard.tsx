"use client";

import Link from "next/link";
import { formatStorePrice } from "@/lib/api/storefront";
import type { StorefrontConfig, StorefrontProduct } from "@/lib/storefront/types";

export default function ProductCard({
  slug,
  product,
  config,
}: {
  slug: string;
  product: StorefrontProduct;
  config: StorefrontConfig;
}) {
  const imageUrl = product.images[0]?.url;

  return (
    <Link
      href={`/shop/${slug}/products/${product.id}`}
      className="group block overflow-hidden rounded-lg border border-zinc-200 bg-white transition-shadow hover:shadow-lg"
    >
      <div
        className="relative aspect-square overflow-hidden"
        style={{ backgroundColor: product.imageColor }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl opacity-30">💎</div>
        )}
        {product.stock === 0 && (
          <span className="absolute left-3 top-3 rounded bg-zinc-900/80 px-2 py-1 text-xs text-white">
            Out of Stock
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wider text-zinc-500">{product.category}</p>
        <h3 className="mt-1 font-medium leading-snug" style={{ color: config.accentColor }}>
          {product.name}
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          {product.metal} · {product.purity} · {product.weightGrams}g
        </p>
        <p className="mt-2 text-lg font-semibold" style={{ color: config.primaryColor }}>
          {formatStorePrice(product.price)}
        </p>
      </div>
    </Link>
  );
}
