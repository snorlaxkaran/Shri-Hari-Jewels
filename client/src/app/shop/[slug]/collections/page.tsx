import Link from "next/link";
import { fetchStorefrontCollections } from "@/lib/api/storefront";

type Props = { params: Promise<{ slug: string }> };

export default async function CollectionsPage({ params }: Props) {
  const { slug } = await params;
  const [collections, config] = await Promise.all([
    fetchStorefrontCollections(slug),
    import("@/lib/api/storefront").then((m) => m.fetchStorefrontConfig(slug)),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-light tracking-wide" style={{ color: config.accentColor }}>
        Collections
      </h1>

      {collections.length === 0 ? (
        <p className="py-20 text-center text-zinc-500">Collections coming soon.</p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/shop/${slug}/collections/${col.slug}`}
              className="group overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-lg"
            >
              <div
                className="aspect-[4/3] overflow-hidden"
                style={{ backgroundColor: config.primaryColor + "22" }}
              >
                {col.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={col.imageUrl} alt={col.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl opacity-30">✨</div>
                )}
              </div>
              <div className="p-5">
                <h2 className="text-lg font-medium" style={{ color: config.accentColor }}>{col.name}</h2>
                {col.description && <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{col.description}</p>}
                <p className="mt-2 text-xs text-zinc-400">{col.productCount} pieces</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
