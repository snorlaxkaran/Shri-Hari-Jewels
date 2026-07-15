import Link from "next/link";
import { fetchStorefrontCollection } from "@/lib/api/storefront";
import ProductCard from "../../(components)/ProductCard";

type Props = { params: Promise<{ slug: string; collectionSlug: string }> };

export default async function CollectionDetailPage({ params }: Props) {
  const { slug, collectionSlug } = await params;
  const [collection, config] = await Promise.all([
    fetchStorefrontCollection(slug, collectionSlug),
    import("@/lib/api/storefront").then((m) => m.fetchStorefrontConfig(slug)),
  ]);

  const products = collection.products ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link href={`/shop/${slug}/collections`} className="text-sm text-zinc-500 hover:underline">
        ← All Collections
      </Link>
      <h1 className="mt-4 text-3xl font-light" style={{ color: config.accentColor }}>
        {collection.name}
      </h1>
      {collection.description && (
        <p className="mt-2 max-w-2xl text-zinc-600">{collection.description}</p>
      )}

      {products.length === 0 ? (
        <p className="py-20 text-center text-zinc-500">No products in this collection yet.</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} slug={slug} product={product} config={config} />
          ))}
        </div>
      )}
    </div>
  );
}
