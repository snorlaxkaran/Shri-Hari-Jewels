import Link from "next/link";
import { Layers } from "lucide-react";
import type { StorefrontCollection } from "@/lib/storefront/types";

export default function CollectionCard({
  slug,
  collection,
}: {
  slug: string;
  collection: StorefrontCollection;
}) {
  const thumb =
    collection.imageUrl ??
    (collection.bannerUrls?.length ? collection.bannerUrls[0] : null);

  return (
    <Link href={`/shop/${slug}/collections/${collection.slug}`} className="sf-collection-card">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt={collection.name} />
      ) : (
        <div className="sf-collection-card-placeholder">
          <Layers size={36} strokeWidth={1} />
        </div>
      )}
      <div className="sf-collection-card-caption">
        <h3>{collection.name}</h3>
        <p>
          {collection.productCount} {collection.productCount === 1 ? "piece" : "pieces"}
          {collection.description ? ` · ${collection.description}` : ""}
        </p>
      </div>
    </Link>
  );
}
