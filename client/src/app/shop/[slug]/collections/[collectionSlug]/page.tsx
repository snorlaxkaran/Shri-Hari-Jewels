import Link from "next/link";
import { fetchStorefrontCollection } from "@/lib/api/storefront";
import ProductCard from "../../(components)/ProductCard";

type Props = { params: Promise<{ slug: string; collectionSlug: string }> };

export default async function CollectionDetailPage({ params }: Props) {
  const { slug, collectionSlug } = await params;
  const collection = await fetchStorefrontCollection(slug, collectionSlug);
  const products = collection.products ?? [];
  const base = `/shop/${slug}`;

  return (
    <div className="sf-section">
      <div className="sf-shell">
        <nav className="sf-breadcrumbs">
          <Link href={base}>Home</Link>
          <span>/</span>
          <Link href={`${base}/collections`}>Collections</Link>
          <span>/</span>
          <span>{collection.name}</span>
        </nav>

        <h1 className="sf-display sf-page-title">{collection.name}</h1>
        {collection.description && (
          <p className="max-w-2xl text-[var(--sf-muted)] leading-relaxed -mt-4 mb-10">{collection.description}</p>
        )}

        {products.length === 0 ? (
          <div className="sf-empty">
            <p className="sf-empty-title">No pieces in this collection yet</p>
            <Link href={`${base}/products`} className="sf-view-all mt-4 inline-flex">
              Shop all jewellery
            </Link>
          </div>
        ) : (
          <div className="sf-product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} slug={slug} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
