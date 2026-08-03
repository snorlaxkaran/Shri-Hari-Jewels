"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Award, Gem, Shield, Scale } from "lucide-react";
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
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    fetchStorefrontProduct(slug, productId)
      .then((p) => {
        setProduct(p);
        setActiveImage(0);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug, productId]);

  if (loading) {
    return (
      <div className="sf-section">
        <div className="sf-shell sf-pdp-grid">
          <div className="sf-skeleton !aspect-square" />
          <div className="space-y-4">
            <div className="sf-skeleton w-2/3 max-w-xs" style={{ height: "2rem" }} />
            <div className="sf-skeleton w-1/3 max-w-[8rem]" style={{ height: "1.5rem" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="sf-empty">
        <p className="sf-empty-title">Piece not found</p>
        <Link href={`/shop/${slug}/products`} className="sf-view-all mt-4 inline-flex">
          Back to shop
        </Link>
      </div>
    );
  }

  const images = product.images.length > 0 ? product.images : [];
  const activeUrl = images[activeImage]?.url;
  const inStock = product.stock > 0;
  const base = `/shop/${slug}`;

  const handleAdd = () => {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="sf-section">
      <div className="sf-shell">
        <nav className="sf-breadcrumbs" aria-label="Breadcrumb">
          <Link href={base}>Home</Link>
          <span>/</span>
          <Link href={`${base}/products`}>Shop</Link>
          <span>/</span>
          <Link href={`${base}/products?category=${encodeURIComponent(product.category)}`}>
            {product.category}
          </Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="sf-pdp-grid">
          <div>
            <div className="sf-pdp-gallery-main" style={{ backgroundColor: product.imageColor }}>
              {activeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeUrl} alt={product.name} />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--sf-gold)] opacity-30">
                  <Gem size={80} strokeWidth={1} />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="sf-pdp-thumbs">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    className={`sf-pdp-thumb ${i === activeImage ? "sf-pdp-thumb-active" : ""}`}
                    onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="sf-product-category">{product.category}</p>
            <h1 className="sf-display text-3xl mt-2">{product.name}</h1>
            <p className="mt-2 text-sm text-[var(--sf-muted)]">SKU: {product.sku}</p>
            <p className="mt-4 text-3xl font-semibold">{formatStorePrice(product.price)}</p>

            <div className="sf-trust-row">
              <span className="sf-trust-badge">
                <Award size={14} />
                Hallmarked
              </span>
              <span className="sf-trust-badge">
                <Shield size={14} />
                {product.purity}
              </span>
              <span className="sf-trust-badge">
                <Scale size={14} />
                {product.weightGrams}g
              </span>
            </div>

            <dl className="sf-spec-grid">
              <div>
                <dt>Metal</dt>
                <dd>{product.metal}</dd>
              </div>
              <div>
                <dt>Purity</dt>
                <dd>{product.purity}</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{product.weightGrams}g</dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>{inStock ? `${product.stock} in stock` : "Out of stock"}</dd>
              </div>
            </dl>

            {product.storefrontDescription && (
              <p className="mt-6 leading-relaxed text-[var(--sf-muted)] whitespace-pre-line">
                {product.storefrontDescription}
              </p>
            )}

            {inStock ? (
              <div className="sf-qty-row">
                <div className="sf-qty-control">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease">
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    aria-label="Increase"
                  >
                    +
                  </button>
                </div>
                <button type="button" onClick={handleAdd} className="sf-btn sf-btn-primary flex-1">
                  {added ? "Added to bag ✓" : "Add to bag"}
                </button>
              </div>
            ) : (
              <p className="mt-8 p-4 rounded-lg border border-[var(--sf-border)] bg-white text-sm text-[var(--sf-muted)]">
                Currently unavailable online.{" "}
                {config.contactPhone && (
                  <>
                    Call{" "}
                    <a href={`tel:${config.contactPhone}`} className="sf-link">
                      {config.contactPhone}
                    </a>{" "}
                    to enquire.
                  </>
                )}
              </p>
            )}

            {config.shippingNote && (
              <p className="mt-4 text-xs text-[var(--sf-muted)]">{config.shippingNote}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
