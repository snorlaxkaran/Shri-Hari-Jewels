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
  return (
    <Link href={`/shop/${slug}/collections/${collection.slug}`} className="sf-collection-card">
      {collection.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={collection.imageUrl} alt={collection.name} />
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
