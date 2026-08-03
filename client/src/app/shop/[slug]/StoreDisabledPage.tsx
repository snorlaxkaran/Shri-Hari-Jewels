export default function StoreDisabledPage({
  businessName,
  slug,
}: {
  businessName: string;
  slug: string;
}) {
  return (
    <div className="sf-page flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#f5f3f0] flex items-center justify-center text-[var(--sf-gold,#b8860b)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 3h12l4 7-10 11L2 10l4-7z" />
          </svg>
        </div>
        <h1 className="sf-display text-2xl mt-6">{businessName}</h1>
        <p className="mt-4 text-[var(--sf-muted)] leading-relaxed">
          Our online store is being set up and will be available soon. Visit our showroom or contact us
          directly in the meantime.
        </p>
        <p className="mt-8 text-xs text-[var(--sf-muted)] font-mono">/{slug}</p>
      </div>
    </div>
  );
}
