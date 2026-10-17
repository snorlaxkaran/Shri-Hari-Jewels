import Link from "next/link";
import { fetchStorefrontCollection, fetchStorefrontConfig } from "@/lib/api/storefront";
import HeroCarousel from "../../(components)/HeroCarousel";
import ProductCard from "../../(components)/ProductCard";

type Props = { params: Promise<{ slug: string; collectionSlug: string }> };

export default async function CollectionDetailPage({ params }: Props) {
  const { slug, collectionSlug } = await params;
  const [collection, config] = await Promise.all([
    fetchStorefrontCollection(slug, collectionSlug),
    fetchStorefrontConfig(slug),
  ]);
  const products = collection.products ?? [];
  const base = `/shop/${slug}`;
  const banners = collection.bannerUrls?.length
    ? collection.bannerUrls
    : collection.imageUrl
      ? [collection.imageUrl]
      : [];

  const heroFallbackStyle = {
    background: `linear-gradient(135deg, ${config.accentColor} 0%, ${config.primaryColor}99 100%)`,
  };

  return (
    <div>
      {banners.length > 0 ? (
        <HeroCarousel images={banners} fallbackStyle={heroFallbackStyle}>
          <p className="sf-eyebrow text-white/70 mb-3">Collection</p>
          <h1 className="sf-display sf-hero-title">{collection.name}</h1>
          {collection.description && (
            <p className="sf-hero-sub max-w-2xl">{collection.description}</p>
          )}
        </HeroCarousel>
      ) : null}

      <div className="sf-section">
        <div className="sf-shell">
          <nav className="sf-breadcrumbs">
            <Link href={base}>Home</Link>
            <span>/</span>
            <Link href={`${base}/collections`}>Collections</Link>
            <span>/</span>
            <span>{collection.name}</span>
          </nav>

          {banners.length === 0 && (
            <>
              <h1 className="sf-display sf-page-title">{collection.name}</h1>
              {collection.description && (
                <p className="max-w-2xl text-[var(--sf-muted)] leading-relaxed -mt-4 mb-10">
                  {collection.description}
                </p>
              )}
            </>
          )}

          {products.length === 0 ? (
            <div className="sf-empty">
              <p className="sf-empty-title">No pieces in this collection yet</p>
              <Link href={`${base}/products`} className="sf-view-all mt-4 inline-flex">
                Shop all jewellery
              </Link>
            </div>
          ) : (
            <div className={`sf-product-grid${banners.length > 0 ? " mt-8" : ""}`}>
              {products.map((product) => (
                <ProductCard key={product.id} slug={slug} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
