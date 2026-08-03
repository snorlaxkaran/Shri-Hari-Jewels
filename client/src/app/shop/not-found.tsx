import Link from "next/link";
import "@/styles/storefront.css";

export default function ShopNotFoundPage() {
  return (
    <div className="sf-page flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#f5f3f0] flex items-center justify-center text-[var(--sf-muted)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
        </div>
        <h1 className="sf-display text-2xl mt-6">Store not found</h1>
        <p className="mt-4 text-[var(--sf-muted)] leading-relaxed">
          This jewellery store does not exist or is no longer available.
        </p>
        <Link href="/login" className="sf-view-all mt-8 inline-flex">
          Go to ERP login
        </Link>
      </div>
    </div>
  );
}
