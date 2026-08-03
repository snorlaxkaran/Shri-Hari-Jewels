import Link from "next/link";
import { fetchStorefrontCollections } from "@/lib/api/storefront";
import CollectionCard from "../(components)/CollectionCard";

type Props = { params: Promise<{ slug: string }> };

export default async function CollectionsPage({ params }: Props) {
  const { slug } = await params;
  const collections = await fetchStorefrontCollections(slug);

  return (
    <div className="sf-section">
      <div className="sf-shell">
        <p className="sf-eyebrow">Curated sets</p>
        <h1 className="sf-display sf-page-title">Collections</h1>
        <p className="text-[var(--sf-muted)] max-w-xl mb-10 leading-relaxed">
          Explore themed collections — bridal, daily wear, festive, and more — handpicked by our jewellers.
        </p>

        {collections.length === 0 ? (
          <div className="sf-empty">
            <p className="sf-empty-title">Collections coming soon</p>
            <Link href={`/shop/${slug}/products`} className="sf-view-all mt-4 inline-flex">
              Browse all jewellery
            </Link>
          </div>
        ) : (
          <div className="sf-collection-grid">
            {collections.map((col) => (
              <CollectionCard key={col.id} slug={slug} collection={col} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
