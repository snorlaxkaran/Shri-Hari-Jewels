import Link from "next/link";
import {
  fetchStorefrontCollections,
  fetchStorefrontProducts,
} from "@/lib/api/storefront";
import ProductCard from "./(components)/ProductCard";

type Props = { params: Promise<{ slug: string }> };

export default async function StorefrontHomePage({ params }: Props) {
  const { slug } = await params;

  const [{ products }, collections] = await Promise.all([
    fetchStorefrontProducts(slug, { limit: 8, sortBy: "newest" }),
    fetchStorefrontCollections(slug),
  ]);

  const config = await import("@/lib/api/storefront").then((m) =>
    m.fetchStorefrontConfig(slug),
  );

  return (
    <div>
      <section
        className="relative flex min-h-[420px] items-center justify-center px-4 py-20 text-center"
        style={{
          background: config.bannerUrl
            ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${config.bannerUrl}) center/cover`
            : `linear-gradient(135deg, ${config.accentColor} 0%, ${config.primaryColor}88 100%)`,
        }}
      >
        <div className="max-w-2xl text-white">
          <h1 className="text-4xl font-light tracking-wide sm:text-5xl">
            {config.heroTitle ?? `Welcome to ${config.businessName}`}
          </h1>
          <p className="mt-4 text-lg text-white/85">
            {config.heroSubtitle ?? config.tagline ?? "Discover exquisite handcrafted jewellery"}
          </p>
          <Link
            href={`/shop/${slug}/products`}
            className="mt-8 inline-block rounded px-8 py-3 text-sm font-semibold uppercase tracking-wider transition-opacity hover:opacity-90"
            style={{ backgroundColor: config.primaryColor, color: "#fff" }}
          >
            Shop Now
          </Link>
        </div>
      </section>

      {collections.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="mb-8 text-center text-2xl font-light tracking-wide" style={{ color: config.accentColor }}>
            Collections
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.slice(0, 3).map((col) => (
              <Link
                key={col.id}
                href={`/shop/${slug}/collections/${col.slug}`}
                className="group relative overflow-hidden rounded-lg"
                style={{ aspectRatio: "4/3", backgroundColor: config.primaryColor + "22" }}
              >
                {col.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={col.imageUrl} alt={col.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl opacity-30">✨</div>
                )}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-6">
                  <div>
                    <h3 className="text-xl font-medium text-white">{col.name}</h3>
                    <p className="text-sm text-white/80">{col.productCount} pieces</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl font-light tracking-wide" style={{ color: config.accentColor }}>
            Featured Pieces
          </h2>
          <Link
            href={`/shop/${slug}/products`}
            className="text-sm font-medium hover:underline"
            style={{ color: config.primaryColor }}
          >
            View all →
          </Link>
        </div>
        {products.length === 0 ? (
          <p className="text-center text-zinc-500 py-12">New pieces coming soon.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} slug={slug} product={product} config={config} />
            ))}
          </div>
        )}
      </section>

      {config.aboutText && (
        <section className="border-t bg-white px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-2xl font-light" style={{ color: config.accentColor }}>
              Our Story
            </h2>
            <p className="leading-relaxed text-zinc-600 whitespace-pre-line">{config.aboutText}</p>
          </div>
        </section>
      )}
    </div>
  );
}
