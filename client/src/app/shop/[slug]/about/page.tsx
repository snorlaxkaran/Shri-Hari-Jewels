import { fetchStorefrontConfig } from "@/lib/api/storefront";

type Props = { params: Promise<{ slug: string }> };

export default async function AboutPage({ params }: Props) {
  const { slug } = await params;
  const config = await fetchStorefrontConfig(slug);

  const address = [config.address, config.city, config.state, config.pincode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-light" style={{ color: config.accentColor }}>
        About {config.businessName}
      </h1>
      {config.aboutText ? (
        <p className="mt-6 leading-relaxed text-zinc-600 whitespace-pre-line">{config.aboutText}</p>
      ) : (
        <p className="mt-6 text-zinc-600">
          {config.businessName} offers fine handcrafted jewellery. Visit our shop to explore our latest collections.
        </p>
      )}

      <div className="mt-12 space-y-4 rounded-lg border bg-white p-6 text-sm">
        <h2 className="font-semibold" style={{ color: config.accentColor }}>Contact</h2>
        {config.contactPhone && <p>Phone: {config.contactPhone}</p>}
        {config.contactEmail && <p>Email: {config.contactEmail}</p>}
        {address && <p>Address: {address}</p>}
        {config.gstNumber && <p>GST: {config.gstNumber}</p>}
      </div>

      {config.returnPolicy && (
        <div className="mt-8 space-y-2 text-sm">
          <h2 className="font-semibold" style={{ color: config.accentColor }}>Return Policy</h2>
          <p className="text-zinc-600 whitespace-pre-line">{config.returnPolicy}</p>
        </div>
      )}
    </div>
  );
}
