"use client";

import Link from "next/link";
import { Gem } from "lucide-react";
import { formatStorePrice } from "@/lib/api/storefront";
import type { StorefrontProduct } from "@/lib/storefront/types";

export default function ProductCard({
  slug,
  product,
}: {
  slug: string;
  product: StorefrontProduct;
}) {
  const imageUrl = product.images[0]?.url;

  return (
    <Link href={`/shop/${slug}/products/${product.id}`} className="sf-product-card">
      <div className="sf-product-image-wrap" style={{ backgroundColor: product.imageColor }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={product.name} className="sf-product-image" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--sf-gold)] opacity-40">
            <Gem size={40} strokeWidth={1} />
          </div>
        )}
        {product.stock === 0 && <span className="sf-product-badge">Sold out</span>}
        <div className="sf-product-overlay">
          <span>View piece</span>
        </div>
      </div>
      <div className="sf-product-body">
        <p className="sf-product-category">{product.category}</p>
        <h3 className="sf-product-name">{product.name}</h3>
        <p className="sf-product-meta">
          {product.metal} · {product.purity} · {product.weightGrams}g
        </p>
        <p className="sf-product-price">{formatStorePrice(product.price)}</p>
      </div>
    </Link>
  );
}
